mod archive;
mod db;
mod models;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use anyhow::Context;
use csv::{ReaderBuilder, WriterBuilder};
use models::{AppPreferences, CsvMapping, CsvPreview, DashboardMetrics, TagDefinition, TradeImage, TradeRecord};
use rusqlite::params;
use serde_json::Value;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, FilePath};
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
            open_journal_dialog,
            save_journal_dialog,
            preview_csv_import,
            execute_csv_import,
            export_flat_csv,
            add_trade_screenshot,
            get_app_preferences,
            save_app_preferences,
            add_trade_screenshot_bytes,
            list_tag_definitions,
            upsert_tag_definition,
            delete_tag_definition,
            clear_journal,
            read_trade_image_bytes,
            add_session_screenshot_bytes
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
fn open_journal_dialog(app: AppHandle, state: State<JournalState>) -> CommandResult<String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Trader Journal", &["trj"])
        .blocking_pick_file();

    match file {
        Some(path) => {
            let archive_path = file_path_to_pathbuf(path)?;
            let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
            archive::extract_archive(&archive_path, &workspace).map_err(error_to_string)?;
            db::connect(&workspace.join("journal.sqlite")).map_err(error_to_string)?;
            *state.archive_path.lock().unwrap() = Some(archive_path.clone());
            Ok(archive_path.display().to_string())
        }
        None => Ok(String::new()),
    }
}

#[tauri::command]
fn save_journal_dialog(app: AppHandle, state: State<JournalState>) -> CommandResult<String> {
    let suggested = state
        .archive_path
        .lock()
        .unwrap()
        .clone()
        .unwrap_or_else(|| PathBuf::from("quantum-journal.trj"));

    let file = app
        .dialog()
        .file()
        .add_filter("Trader Journal", &["trj"])
        .set_file_name(suggested.file_name().and_then(|value| value.to_str()).unwrap_or("quantum-journal.trj"))
        .blocking_save_file();

    match file {
        Some(path) => {
            let archive_path = file_path_to_pathbuf(path)?;
            let workspace = workspace_dir(&app, &state).map_err(error_to_string)?;
            archive::pack_archive(&workspace, &archive_path).map_err(error_to_string)?;
            *state.archive_path.lock().unwrap() = Some(archive_path.clone());
            Ok(archive_path.display().to_string())
        }
        None => Ok(String::new()),
    }
}

#[tauri::command]
fn preview_csv_import(file_path: String) -> CommandResult<CsvPreview> {
    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .from_path(&file_path)
        .map_err(error_to_string)?;
    let headers = reader
        .headers()
        .map_err(error_to_string)?
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>();

    let sample_rows = reader
        .records()
        .take(5)
        .map(|result| {
            result
                .map(|row| row.iter().map(ToString::to_string).collect::<Vec<_>>())
                .map_err(error_to_string)
        })
        .collect::<CommandResult<Vec<_>>>()?;

    Ok(CsvPreview { headers, sample_rows })
}

#[tauri::command]
fn execute_csv_import(app: AppHandle, state: State<JournalState>, file_path: String, mapping: CsvMapping) -> CommandResult<usize> {
    let conn = db::connect(&db_path(&app, &state).map_err(error_to_string)?).map_err(error_to_string)?;
    let mut reader = ReaderBuilder::new().flexible(true).from_path(&file_path).map_err(error_to_string)?;
    let headers = reader.headers().map_err(error_to_string)?.clone();
    let mut imported = 0usize;

    for row in reader.records() {
      let row = row.map_err(error_to_string)?;
      let mut object = serde_json::Map::new();
      for (internal, external) in &mapping {
          if let Some(index) = headers.iter().position(|header| header == external) {
              object.insert(internal.clone(), Value::String(row.get(index).unwrap_or_default().to_string()));
          }
      }

      normalize_csv_payload(&mut object);
      let trade = db::from_partial_trade(Value::Object(object)).map_err(error_to_string)?;
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
            "instrument",
            "side",
            "entry_timestamp",
            "exit_timestamp",
            "entry_price",
            "exit_price",
            "contracts",
            "gross_pnl",
            "net_pnl",
            "r_multiple",
            "mae",
            "mfe",
            "hold_minutes",
            "mood",
            "setup_description",
            "tags",
        ])
        .map_err(error_to_string)?;

    for trade in trades {
        writer
            .write_record([
                trade.id,
                format!("{:?}", trade.instrument).to_uppercase(),
                format!("{:?}", trade.side).to_uppercase(),
                trade.entry_timestamp,
                trade.exit_timestamp,
                trade.entry_price.to_string(),
                trade.exit_price.to_string(),
                trade.contracts.to_string(),
                trade.gross_pnl.to_string(),
                trade.net_pnl.to_string(),
                trade.r_multiple.to_string(),
                trade.mae.unwrap_or_default().to_string(),
                trade.mfe.unwrap_or_default().to_string(),
                trade.hold_minutes.to_string(),
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

fn normalize_csv_payload(object: &mut serde_json::Map<String, Value>) {
    for numeric in ["entry_price", "exit_price", "stop_loss", "take_profit"] {
        if let Some(value) = object.remove(numeric) {
            let normalized = value.as_str().unwrap_or_default().replace(',', "");
            if let Ok(number) = normalized.parse::<f64>() {
                let key = camel_case(numeric);
                object.insert(key, serde_json::json!(number));
            }
        }
    }

    if let Some(value) = object.remove("contracts") {
        let normalized = value.as_str().unwrap_or_default().replace(',', "");
        if let Ok(number) = normalized.parse::<i64>() {
            object.insert("contracts".to_string(), serde_json::json!(number));
        }
    }

    for datetime in ["entry_timestamp", "exit_timestamp"] {
        if let Some(value) = object.remove(datetime) {
            object.insert(camel_case(datetime), value);
        }
    }

    for text in ["instrument", "side", "setup_description"] {
        if let Some(value) = object.remove(text) {
            object.insert(camel_case(text), value);
        }
    }

    if let Some(value) = object.remove("tags") {
        let tags = value
            .as_str()
            .unwrap_or_default()
            .split('|')
            .map(str::trim)
            .filter(|tag| !tag.is_empty())
            .map(|tag| Value::String(tag.to_string()))
            .collect::<Vec<_>>();
        object.insert("tags".to_string(), Value::Array(tags));
    }
}

fn camel_case(input: &str) -> String {
    let mut output = String::new();
    let mut upper = false;
    for ch in input.chars() {
        if ch == '_' {
            upper = true;
            continue;
        }
        if upper {
            output.push(ch.to_ascii_uppercase());
            upper = false;
        } else {
            output.push(ch);
        }
    }
    output
}

fn file_path_to_pathbuf(path: FilePath) -> CommandResult<PathBuf> {
    match path {
        FilePath::Path(path) => Ok(path),
        FilePath::Url(url) => url.to_file_path().map_err(|_| "Unsupported file URL".to_string()),
    }
}

fn error_to_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}
