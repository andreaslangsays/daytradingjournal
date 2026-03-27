mod archive;
mod db;
mod models;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use anyhow::Context;
use calamine::{open_workbook_auto, Reader};
use csv::WriterBuilder;
use chrono::{Duration, NaiveDate, TimeZone, Utc};
use models::{AppPreferences, CsvPreview, DashboardMetrics, Instrument, Side, TagDefinition, TradeImage, TradeRecord};
use rusqlite::params;
use serde_json::Value;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

type CommandResult<T> = std::result::Result<T, String>;

#[derive(Default)]
struct JournalState {
    workspace_dir: Mutex<Option<PathBuf>>,
    archive_path: Mutex<Option<PathBuf>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(JournalState::default())
        .setup(|app| {
            initialize_workspace(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_trades,
            upsert_trade,
            get_dashboard_metrics,
            open_journal_from_path,
            save_journal_to_path,
            preview_atas_import,
            execute_atas_import,
            export_flat_csv,
            add_trade_screenshot,
            get_app_preferences,
            save_app_preferences,
            get_instrument_fee_presets,
            save_instrument_fee_presets,
            add_trade_screenshot_bytes,
            delete_trade_image,
            list_tag_definitions,
            upsert_tag_definition,
            delete_tag_definition,
            clear_journal,
            read_trade_image_bytes,
            add_session_screenshot_bytes,
            delete_session_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn initialize_workspace(app: &AppHandle) -> anyhow::Result<()> {
    let base = app.path().app_data_dir().context("Unable to resolve app data dir")?;
    let workspace = base.join("active-journal");
    fs::create_dir_all(workspace.join("images"))?;
    let db_path = workspace.join("journal.sqlite");
    db::connect(&db_path)?;
    let state = app.state::<JournalState>();
    *state.workspace_dir.lock().unwrap() = Some(workspace);
    Ok(())
}

fn workspace_dir(app: &AppHandle, state: &State<JournalState>) -> anyhow::Result<PathBuf> {
    if let Some(path) = state.workspace_dir.lock().unwrap().clone() {
        return Ok(path);
    }
    let base = app.path().app_data_dir().context("Unable to resolve app data dir")?;
    let workspace = base.join("active-journal");
    fs::create_dir_all(workspace.join("images"))?;
    *state.workspace_dir.lock().unwrap() = Some(workspace.clone());
    Ok(workspace)
}

fn db_path(app: &AppHandle, state: &State<JournalState>) -> anyhow::Result<PathBuf> {
    Ok(workspace_dir(app, state)?.join("journal.sqlite"))
}

#[tauri::command]
fn list_trades(app: AppHandle, state: State<JournalState>) -> CommandResult<Vec<TradeRecord>> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::list_trades(&conn).map_err(error_to_string)
}

#[tauri::command]
fn get_dashboard_metrics(app: AppHandle, state: State<JournalState>) -> CommandResult<DashboardMetrics> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::get_dashboard_metrics(&conn).map_err(error_to_string)
}

#[tauri::command]
fn upsert_trade(app: AppHandle, state: State<JournalState>, payload: Value) -> CommandResult<TradeRecord> {
    let db_file = db_path(&app, &state).map_err(error_to_string)?;
    let conn = db::connect(&db_file).map_err(error_to_string)?;
    let trade = db::from_partial_trade(payload).map_err(error_to_string)?;
    db::upsert_trade(&conn, trade).map_err(error_to_string)
}

#[tauri::command]
fn open_journal_from_path(app: AppHandle, state: State<JournalState>, file_path: String) -> CommandResult<String> {
    let archive_path = PathBuf::from(file_path);
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    archive::extract_archive(&archive_path, &workspace).map_err(error_to_string)?;
    db::connect(&workspace.join("journal.sqlite")).map_err(error_to_string)?;
    *state.archive_path.lock().unwrap() = Some(archive_path.clone());
    Ok(archive_path.display().to_string())
}

#[tauri::command]
fn save_journal_to_path(app: AppHandle, state: State<JournalState>, file_path: String) -> CommandResult<String> {
    let mut archive_path = PathBuf::from(file_path);
    if archive_path.extension().and_then(|value| value.to_str()) != Some("trj") {
        archive_path.set_extension("trj");
    }

    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    archive::pack_archive(&workspace, &archive_path).map_err(error_to_string)?;
    *state.archive_path.lock().unwrap() = Some(archive_path.clone());
    Ok(archive_path.display().to_string())
}

#[tauri::command]
fn preview_atas_import(file_path: String) -> CommandResult<CsvPreview> {
    let rows = read_atas_sheet_rows(&file_path).map_err(error_to_string)?;
    let headers = rows.first().cloned().unwrap_or_default();
    let sample_rows = rows.into_iter().skip(1).take(5).collect::<Vec<_>>();
    Ok(CsvPreview { headers, sample_rows })
}

#[tauri::command]
fn execute_atas_import(app: AppHandle, state: State<JournalState>, file_path: String) -> CommandResult<usize> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    let rows = attach_execution_stats(
        read_atas_journal_entries(&file_path).map_err(error_to_string)?,
        read_atas_execution_entries(&file_path).unwrap_or_default(),
    );
    let mut imported = 0usize;
    let mut session_state = HashMap::<String, (usize, chrono::DateTime<Utc>)>::new();

    for row in rows {
        let session_key = row.entry_time.date_naive().format("%Y-%m-%d").to_string();
        let session_entry = session_state
            .entry(session_key.clone())
            .or_insert((1usize, row.exit_time));
        if row.entry_time.signed_duration_since(session_entry.1) > Duration::hours(4) {
            session_entry.0 += 1;
        }
        session_entry.1 = row.exit_time;

        let session_id = format!("{}-{:02}", session_key, session_entry.0);
        let id_seed = format!(
            "{}|{}|{}|{}|{}|{}|{}",
            row.account,
            row.instrument_raw,
            row.entry_time.to_rfc3339(),
            row.exit_time.to_rfc3339(),
            row.entry_price,
            row.exit_price,
            row.contracts
        );
        let (instrument, custom_instrument) = map_atas_instrument(&row.instrument_raw);

        let trade = TradeRecord {
            id: Uuid::new_v5(&Uuid::NAMESPACE_URL, id_seed.as_bytes()).to_string(),
            session_id,
            account: row.account,
            instrument,
            custom_instrument,
            side: row.side,
            entry_timestamp: row.entry_time.to_rfc3339(),
            exit_timestamp: row.exit_time.to_rfc3339(),
            entry_price: row.entry_price,
            exit_price: row.exit_price,
            contracts: row.contracts,
            stop_loss: None,
            take_profit: None,
            gross_pnl: row.pnl,
            net_pnl: row.pnl - row.commission,
            commission: row.commission,
            r_multiple: 0.0,
            mae: None,
            mfe: None,
            hold_minutes: row.exit_time.signed_duration_since(row.entry_time).num_minutes().max(0),
            execution_count: row.execution_count,
            mood: "🙂".to_string(),
            setup_description: row.comment,
            tags: Vec::new(),
            images: Vec::new(),
            session_images: Vec::new(),
        };

        db::upsert_trade(&conn, trade).map_err(error_to_string)?;
        imported += 1;
    }

    Ok(imported)
}

#[tauri::command]
fn export_flat_csv(app: AppHandle, state: State<JournalState>, file_path: String) -> CommandResult<String> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    let trades = db::list_trades(&conn).map_err(error_to_string)?;
    let target = PathBuf::from(file_path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(error_to_string)?;
        }
    }
    let mut writer = WriterBuilder::new().from_path(&target).map_err(error_to_string)?;
    writer
        .write_record([
            "id",
            "session_id",
            "account",
            "instrument",
            "side",
            "entry_timestamp",
            "exit_timestamp",
            "entry_price",
            "exit_price",
            "contracts",
            "gross_pnl",
            "net_pnl",
            "commission",
            "r_multiple",
            "mae",
            "mfe",
            "hold_minutes",
            "execution_count",
            "mood",
            "setup_description",
            "tags",
        ])
        .map_err(error_to_string)?;

    for trade in trades {
        writer
            .write_record([
                trade.id,
                trade.session_id,
                trade.account,
                format!("{:?}", trade.instrument).to_uppercase(),
                format!("{:?}", trade.side).to_uppercase(),
                trade.entry_timestamp,
                trade.exit_timestamp,
                trade.entry_price.to_string(),
                trade.exit_price.to_string(),
                trade.contracts.to_string(),
                trade.gross_pnl.to_string(),
                trade.net_pnl.to_string(),
                trade.commission.to_string(),
                trade.r_multiple.to_string(),
                trade.mae.unwrap_or_default().to_string(),
                trade.mfe.unwrap_or_default().to_string(),
                trade.hold_minutes.to_string(),
                trade.execution_count.to_string(),
                trade.mood,
                trade.setup_description,
                trade.tags.join("|"),
            ])
            .map_err(error_to_string)?;
    }
    writer.flush().map_err(error_to_string)?;
    Ok(target.display().to_string())
}

#[tauri::command]
fn add_trade_screenshot(
    app: AppHandle,
    state: State<JournalState>,
    trade_id: String,
    source_path: String,
    description: Option<String>,
) -> CommandResult<TradeImage> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let images_dir = workspace.join("images");
    let stored_path = archive::convert_image_to_webp(Path::new(&source_path), &images_dir).map_err(error_to_string)?;
    let relative_path = stored_path
        .strip_prefix(&workspace)
        .map_err(error_to_string)?
        .to_string_lossy()
        .replace('\\', "/");
    let image = TradeImage {
        id: Uuid::new_v4().to_string(),
        trade_id: trade_id.clone(),
        relative_path,
        description,
    };

    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    conn.execute(
        "INSERT INTO trade_images (id, trade_id, relative_path, description) VALUES (?1, ?2, ?3, ?4)",
        params![image.id, trade_id, image.relative_path, image.description],
    )
    .map_err(error_to_string)?;
    Ok(image)
}

#[tauri::command]
fn add_trade_screenshot_bytes(
    app: AppHandle,
    state: State<JournalState>,
    trade_id: String,
    bytes: Vec<u8>,
    description: Option<String>,
    file_name: Option<String>,
) -> CommandResult<TradeImage> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let images_dir = workspace.join("images");
    let stem = file_name
        .as_deref()
        .and_then(|value| Path::new(value).file_stem().and_then(|item| item.to_str()));
    let stored_path = archive::convert_image_bytes_to_webp(&bytes, &images_dir, stem).map_err(error_to_string)?;
    let relative_path = stored_path
        .strip_prefix(&workspace)
        .map_err(error_to_string)?
        .to_string_lossy()
        .replace('\\', "/");

    let image = TradeImage {
        id: Uuid::new_v4().to_string(),
        trade_id: trade_id.clone(),
        relative_path,
        description,
    };

    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    conn.execute(
        "INSERT INTO trade_images (id, trade_id, relative_path, description) VALUES (?1, ?2, ?3, ?4)",
        params![image.id, trade_id, image.relative_path, image.description],
    )
    .map_err(error_to_string)?;
    Ok(image)
}

#[tauri::command]
fn get_app_preferences(app: AppHandle, state: State<JournalState>) -> CommandResult<AppPreferences> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::get_app_preferences(&conn).map_err(error_to_string)
}

#[tauri::command]
fn save_app_preferences(
    app: AppHandle,
    state: State<JournalState>,
    preferences: AppPreferences,
) -> CommandResult<AppPreferences> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::save_app_preferences(&conn, preferences).map_err(error_to_string)
}

#[tauri::command]
fn get_instrument_fee_presets(
    app: AppHandle,
    state: State<JournalState>,
) -> CommandResult<HashMap<String, f64>> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::get_instrument_fee_presets(&conn).map_err(error_to_string)
}

#[tauri::command]
fn save_instrument_fee_presets(
    app: AppHandle,
    state: State<JournalState>,
    presets: HashMap<String, f64>,
) -> CommandResult<HashMap<String, f64>> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::save_instrument_fee_presets(&conn, presets).map_err(error_to_string)
}

#[tauri::command]
fn list_tag_definitions(app: AppHandle, state: State<JournalState>) -> CommandResult<Vec<TagDefinition>> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::list_tag_definitions(&conn).map_err(error_to_string)
}

#[tauri::command]
fn upsert_tag_definition(
    app: AppHandle,
    state: State<JournalState>,
    tag: TagDefinition,
) -> CommandResult<TagDefinition> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::upsert_tag_definition(&conn, tag).map_err(error_to_string)
}

#[tauri::command]
fn delete_tag_definition(app: AppHandle, state: State<JournalState>, tag_id: String) -> CommandResult<()> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::delete_tag_definition(&conn, &tag_id).map_err(error_to_string)
}

#[tauri::command]
fn clear_journal(app: AppHandle, state: State<JournalState>, confirmation: String) -> CommandResult<()> {
    if confirmation.trim() != "CLEAR JOURNAL" {
        return Err("Invalid confirmation phrase".to_string());
    }

    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    db::clear_journal(&conn).map_err(error_to_string)?;

    let images_dir = workspace.join("images");
    if images_dir.exists() {
        fs::remove_dir_all(&images_dir).map_err(error_to_string)?;
    }
    fs::create_dir_all(&images_dir).map_err(error_to_string)?;
    Ok(())
}

#[tauri::command]
fn read_trade_image_bytes(app: AppHandle, state: State<JournalState>, relative_path: String) -> CommandResult<Vec<u8>> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let target = workspace.join(relative_path);
    fs::read(target).map_err(error_to_string)
}

#[tauri::command]
fn add_session_screenshot_bytes(
    app: AppHandle,
    state: State<JournalState>,
    session_id: String,
    bytes: Vec<u8>,
    description: Option<String>,
    file_name: Option<String>,
) -> CommandResult<TradeImage> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let images_dir = workspace.join("images");
    let stem = file_name
        .as_deref()
        .and_then(|value| Path::new(value).file_stem().and_then(|item| item.to_str()));
    let stored_path = archive::convert_image_bytes_to_webp(&bytes, &images_dir, stem).map_err(error_to_string)?;
    let relative_path = stored_path
        .strip_prefix(&workspace)
        .map_err(error_to_string)?
        .to_string_lossy()
        .replace('\\', "/");

    let image = TradeImage {
        id: Uuid::new_v4().to_string(),
        trade_id: session_id.clone(),
        relative_path,
        description,
    };

    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    conn.execute(
        "INSERT INTO session_images (id, session_id, relative_path, description) VALUES (?1, ?2, ?3, ?4)",
        params![image.id, session_id, image.relative_path, image.description],
    )
    .map_err(error_to_string)?;
    Ok(image)
}

#[tauri::command]
fn delete_trade_image(app: AppHandle, state: State<JournalState>, image_id: String) -> CommandResult<()> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    let relative_path: String = conn
        .query_row(
            "SELECT relative_path FROM trade_images WHERE id = ?1 LIMIT 1",
            params![image_id],
            |row| row.get(0),
        )
        .map_err(error_to_string)?;
    conn.execute("DELETE FROM trade_images WHERE id = ?1", params![image_id])
        .map_err(error_to_string)?;
    let file_path = workspace.join(relative_path);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(error_to_string)?;
    }
    Ok(())
}

#[tauri::command]
fn delete_session_image(app: AppHandle, state: State<JournalState>, image_id: String) -> CommandResult<()> {
    let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    let relative_path: String = conn
        .query_row(
            "SELECT relative_path FROM session_images WHERE id = ?1 LIMIT 1",
            params![image_id],
            |row| row.get(0),
        )
        .map_err(error_to_string)?;
    conn.execute("DELETE FROM session_images WHERE id = ?1", params![image_id])
        .map_err(error_to_string)?;
    let file_path = workspace.join(relative_path);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(error_to_string)?;
    }
    Ok(())
}

fn error_to_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[derive(Debug)]
struct AtasJournalEntry {
    account: String,
    instrument_raw: String,
    entry_time: chrono::DateTime<Utc>,
    exit_time: chrono::DateTime<Utc>,
    entry_price: f64,
    exit_price: f64,
    contracts: i64,
    pnl: f64,
    commission: f64,
    execution_count: i64,
    side: Side,
    comment: String,
}

#[derive(Debug, Clone)]
struct AtasExecutionEntry {
    account: String,
    instrument_raw: String,
    execution_time: chrono::DateTime<Utc>,
    commission: f64,
}

fn read_atas_sheet_rows(file_path: &str) -> anyhow::Result<Vec<Vec<String>>> {
    let mut workbook = open_workbook_auto(file_path)
        .with_context(|| format!("Unable to open ATAS workbook at {file_path}"))?;
    let range = workbook
        .worksheet_range("Journal")
        .with_context(|| "ATAS workbook does not contain a `Journal` sheet")?;

    Ok(range
        .rows()
        .filter(|row| row.iter().any(|cell| !cell.to_string().trim().is_empty()))
        .map(|row| row.iter().map(|cell| cell.to_string()).collect::<Vec<_>>())
        .collect())
}

fn read_atas_journal_entries(file_path: &str) -> anyhow::Result<Vec<AtasJournalEntry>> {
    let rows = read_atas_sheet_rows(file_path)?;
    let headers = rows.first().context("ATAS `Journal` sheet is empty")?;
    let index = |name: &str| {
        headers
            .iter()
            .position(|header| header == name)
            .with_context(|| format!("ATAS `Journal` sheet is missing the `{name}` column"))
    };

    let account_idx = index("Konto").or_else(|_| index("Account"))?;
    let instrument_idx = index("Instrument")?;
    let open_time_idx = index("Open time")?;
    let open_price_idx = index("Open price")?;
    let open_volume_idx = index("Open volume")?;
    let close_time_idx = index("Close time")?;
    let close_price_idx = index("Close price")?;
    let pnl_idx = index("PnL")?;
    let comment_idx = index("Kommentar").or_else(|_| index("Comment"))?;

    let mut entries = Vec::new();
    for row in rows.into_iter().skip(1) {
        if row.iter().all(|value| value.trim().is_empty()) {
            continue;
        }

        let open_volume = parse_decimal(row.get(open_volume_idx).map(String::as_str).unwrap_or_default())?;
        let entry_time = parse_atas_excel_datetime(row.get(open_time_idx).map(String::as_str).unwrap_or_default())?;
        let exit_time = parse_atas_excel_datetime(row.get(close_time_idx).map(String::as_str).unwrap_or_default())?;
        let entry = AtasJournalEntry {
            account: row.get(account_idx).cloned().unwrap_or_default(),
            instrument_raw: row.get(instrument_idx).cloned().unwrap_or_default(),
            entry_time,
            exit_time,
            entry_price: parse_decimal(row.get(open_price_idx).map(String::as_str).unwrap_or_default())?,
            exit_price: parse_decimal(row.get(close_price_idx).map(String::as_str).unwrap_or_default())?,
            contracts: open_volume.abs().round() as i64,
            pnl: parse_decimal(row.get(pnl_idx).map(String::as_str).unwrap_or_default())?,
            commission: 0.0,
            execution_count: 0,
            side: if open_volume < 0.0 { Side::Short } else { Side::Long },
            comment: row.get(comment_idx).cloned().unwrap_or_default(),
        };
        entries.push(entry);
    }

    Ok(entries)
}

fn read_atas_execution_entries(file_path: &str) -> anyhow::Result<Vec<AtasExecutionEntry>> {
    let mut workbook = open_workbook_auto(file_path)
        .with_context(|| format!("Unable to open ATAS workbook at {file_path}"))?;
    let range = workbook
        .worksheet_range("Executions")
        .with_context(|| "ATAS workbook does not contain an `Executions` sheet")?;

    let rows = range
        .rows()
        .filter(|row| row.iter().any(|cell| !cell.to_string().trim().is_empty()))
        .map(|row| row.iter().map(|cell| cell.to_string()).collect::<Vec<_>>())
        .collect::<Vec<_>>();

    let headers = rows.first().context("ATAS `Executions` sheet is empty")?;
    let index = |candidates: &[&str]| {
        candidates
            .iter()
            .find_map(|name| headers.iter().position(|header| header == *name))
            .with_context(|| format!("ATAS `Executions` sheet is missing one of {:?}", candidates))
    };

    let account_idx = index(&["Konto", "Account"])?;
    let instrument_idx = index(&["Instrument"])?;
    let time_idx = index(&["Time", "Execution time", "Date time", "Date/Time"])?;
    let commission_idx = index(&["Commission", "Fee", "Fees", "Комиссия"]).ok();

    let mut entries = Vec::new();
    for row in rows.into_iter().skip(1) {
        if row.iter().all(|value| value.trim().is_empty()) {
            continue;
        }

        let raw_time = row.get(time_idx).map(String::as_str).unwrap_or_default();
        let execution_time =
            parse_atas_excel_datetime(raw_time).or_else(|_| parse_atas_datetime_fallback(raw_time))?;
        let commission = commission_idx
            .and_then(|idx| row.get(idx))
            .map(|value| parse_decimal(value).unwrap_or(0.0))
            .unwrap_or(0.0);

        entries.push(AtasExecutionEntry {
            account: row.get(account_idx).cloned().unwrap_or_default(),
            instrument_raw: row.get(instrument_idx).cloned().unwrap_or_default(),
            execution_time,
            commission,
        });
    }

    Ok(entries)
}

fn attach_execution_stats(
    mut journal_entries: Vec<AtasJournalEntry>,
    execution_entries: Vec<AtasExecutionEntry>,
) -> Vec<AtasJournalEntry> {
    for journal_entry in &mut journal_entries {
        let normalized_account = journal_entry.account.trim();
        let normalized_instrument = journal_entry.instrument_raw.trim().to_ascii_uppercase();
        let mut execution_count = 0i64;
        let mut commission = 0.0;

        for execution in &execution_entries {
            if execution.account.trim() != normalized_account {
                continue;
            }
            if execution.instrument_raw.trim().to_ascii_uppercase() != normalized_instrument {
                continue;
            }
            if execution.execution_time < journal_entry.entry_time || execution.execution_time > journal_entry.exit_time {
                continue;
            }

            execution_count += 1;
            commission += execution.commission.abs();
        }

        journal_entry.execution_count = execution_count;
        journal_entry.commission = commission;
    }

    journal_entries
}

fn parse_decimal(value: &str) -> anyhow::Result<f64> {
    value
        .trim()
        .replace(',', "")
        .parse::<f64>()
        .with_context(|| format!("Unable to parse numeric value `{value}`"))
}

fn parse_atas_excel_datetime(value: &str) -> anyhow::Result<chrono::DateTime<Utc>> {
    let serial = parse_decimal(value)?;
    let base = NaiveDate::from_ymd_opt(1899, 12, 30)
        .and_then(|date| date.and_hms_opt(0, 0, 0))
        .context("Unable to initialize Excel date epoch")?;
    let millis = (serial * 86_400_000.0).round() as i64;
    Ok(Utc.from_utc_datetime(&(base + Duration::milliseconds(millis))))
}

fn parse_atas_datetime_fallback(value: &str) -> anyhow::Result<chrono::DateTime<Utc>> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|parsed| parsed.with_timezone(&Utc))
        .or_else(|_| chrono::NaiveDateTime::parse_from_str(value, "%d.%m.%Y %H:%M:%S").map(|parsed| Utc.from_utc_datetime(&parsed)))
        .or_else(|_| chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S").map(|parsed| Utc.from_utc_datetime(&parsed)))
        .with_context(|| format!("Unable to parse ATAS datetime value `{value}`"))
}

fn map_atas_instrument(value: &str) -> (Instrument, Option<String>) {
    let upper = value.to_ascii_uppercase();
    if upper.starts_with("MES") {
        (Instrument::Mes, None)
    } else if upper.starts_with("MNQ") {
        (Instrument::Mnq, None)
    } else if upper.starts_with("MCL") {
        (Instrument::Mcl, None)
    } else if upper.starts_with("BTCUS") {
        (Instrument::Btcus, None)
    } else if upper.starts_with("ES") {
        (Instrument::Es, None)
    } else if upper.starts_with("NQ") {
        (Instrument::Nq, None)
    } else if upper.starts_with("CL") {
        (Instrument::Cl, None)
    } else {
        (Instrument::Custom, Some(value.to_string()))
    }
}
