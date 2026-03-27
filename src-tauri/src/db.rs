use std::path::Path;

use anyhow::Result;
use chrono::{DateTime, Datelike, NaiveDateTime, TimeZone, Timelike, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use crate::models::{AppPreferences, DashboardMetrics, HeatmapPoint, Instrument, MaeMfePoint, SeriesPoint, Side, TagDefinition, TagStat, TradeImage, TradeRecord};

pub fn connect(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL DEFAULT '',
            account TEXT NOT NULL DEFAULT '',
            instrument TEXT NOT NULL,
            custom_instrument TEXT,
            side TEXT NOT NULL,
            entry_timestamp TEXT NOT NULL,
            exit_timestamp TEXT NOT NULL,
            entry_price REAL NOT NULL,
            exit_price REAL NOT NULL,
            contracts INTEGER NOT NULL,
            stop_loss REAL,
            take_profit REAL,
            gross_pnl REAL NOT NULL,
            net_pnl REAL NOT NULL,
            commission REAL NOT NULL DEFAULT 0,
            r_multiple REAL NOT NULL,
            mae REAL,
            mfe REAL,
            hold_minutes INTEGER NOT NULL,
            execution_count INTEGER NOT NULL DEFAULT 0,
            mood TEXT NOT NULL DEFAULT '🙂',
            setup_description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS trade_tags (
            trade_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY (trade_id, tag),
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS trade_images (
            id TEXT PRIMARY KEY,
            trade_id TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS session_images (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tag_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#22d3ee',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )?;
    ensure_trade_session_column(conn)?;
    seed_default_tags(conn)?;
    Ok(())
}

pub fn get_app_preferences(conn: &Connection) -> Result<AppPreferences> {
    Ok(AppPreferences {
        language: read_setting(conn, "language")?.unwrap_or_else(|| "de".to_string()),
        active_tab: read_setting(conn, "active_tab")?.unwrap_or_else(|| "dashboard".to_string()),
        theme: read_setting(conn, "theme")?.unwrap_or_else(|| "light".to_string()),
    })
}

pub fn save_app_preferences(conn: &Connection, preferences: AppPreferences) -> Result<AppPreferences> {
    write_setting(conn, "language", &preferences.language)?;
    write_setting(conn, "active_tab", &preferences.active_tab)?;
    write_setting(conn, "theme", &preferences.theme)?;
    get_app_preferences(conn)
}

pub fn get_instrument_fee_presets(conn: &Connection) -> Result<std::collections::HashMap<String, f64>> {
    let raw = read_setting(conn, "instrument_fee_presets")?.unwrap_or_else(|| "{}".to_string());
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

pub fn save_instrument_fee_presets(
    conn: &Connection,
    presets: std::collections::HashMap<String, f64>,
) -> Result<std::collections::HashMap<String, f64>> {
    let raw = serde_json::to_string(&presets)?;
    write_setting(conn, "instrument_fee_presets", &raw)?;
    get_instrument_fee_presets(conn)
}

pub fn list_tag_definitions(conn: &Connection) -> Result<Vec<TagDefinition>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, name, color
        FROM tag_definitions
        ORDER BY LOWER(name) ASC
        "#,
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(TagDefinition {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    })?;
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row?);
    }
    Ok(tags)
}

pub fn upsert_tag_definition(conn: &Connection, tag: TagDefinition) -> Result<TagDefinition> {
    let previous_name: Option<String> = conn
        .query_row(
            "SELECT name FROM tag_definitions WHERE id = ?1 LIMIT 1",
            params![tag.id],
            |row| row.get(0),
        )
        .optional()?;

    conn.execute(
        r#"
        INSERT INTO tag_definitions (id, name, color, updated_at)
        VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![tag.id, tag.name, tag.color],
    )?;

    if let Some(old_name) = previous_name {
        if old_name != tag.name {
            conn.execute(
                "UPDATE trade_tags SET tag = ?1 WHERE tag = ?2",
                params![tag.name, old_name],
            )?;
        }
    }

    Ok(tag)
}

pub fn delete_tag_definition(conn: &Connection, tag_id: &str) -> Result<()> {
    let name: Option<String> = conn
        .query_row(
            "SELECT name FROM tag_definitions WHERE id = ?1 LIMIT 1",
            params![tag_id],
            |row| row.get(0),
        )
        .optional()?;

    conn.execute("DELETE FROM tag_definitions WHERE id = ?1", params![tag_id])?;
    if let Some(name) = name {
        conn.execute("DELETE FROM trade_tags WHERE tag = ?1", params![name])?;
    }
    Ok(())
}

pub fn clear_journal(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM session_images", [])?;
    conn.execute("DELETE FROM trade_images", [])?;
    conn.execute("DELETE FROM trade_tags", [])?;
    conn.execute("DELETE FROM trades", [])?;
    Ok(())
}

pub fn upsert_trade(conn: &Connection, payload: TradeRecord) -> Result<TradeRecord> {
    conn.execute(
        r#"
        INSERT INTO trades (
            id, session_id, account, instrument, custom_instrument, side, entry_timestamp, exit_timestamp,
            entry_price, exit_price, contracts, stop_loss, take_profit,
            gross_pnl, net_pnl, commission, r_multiple, mae, mfe, hold_minutes, execution_count, mood, setup_description, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            session_id=excluded.session_id,
            account=excluded.account,
            instrument=excluded.instrument,
            custom_instrument=excluded.custom_instrument,
            side=excluded.side,
            entry_timestamp=excluded.entry_timestamp,
            exit_timestamp=excluded.exit_timestamp,
            entry_price=excluded.entry_price,
            exit_price=excluded.exit_price,
            contracts=excluded.contracts,
            stop_loss=excluded.stop_loss,
            take_profit=excluded.take_profit,
            gross_pnl=excluded.gross_pnl,
            net_pnl=excluded.net_pnl,
            commission=excluded.commission,
            r_multiple=excluded.r_multiple,
            mae=excluded.mae,
            mfe=excluded.mfe,
            hold_minutes=excluded.hold_minutes,
            execution_count=excluded.execution_count,
            mood=excluded.mood,
            setup_description=excluded.setup_description,
            updated_at=CURRENT_TIMESTAMP
        "#,
        params![
            payload.id,
            payload.session_id,
            payload.account,
            instrument_to_str(&payload.instrument),
            payload.custom_instrument,
            side_to_str(&payload.side),
            payload.entry_timestamp,
            payload.exit_timestamp,
            payload.entry_price,
            payload.exit_price,
            payload.contracts,
            payload.stop_loss,
            payload.take_profit,
            payload.gross_pnl,
            payload.net_pnl,
            payload.commission,
            payload.r_multiple,
            payload.mae,
            payload.mfe,
            payload.hold_minutes,
            payload.execution_count,
            payload.mood,
            payload.setup_description,
        ],
    )?;

    conn.execute("DELETE FROM trade_tags WHERE trade_id = ?1", params![payload.id])?;
    for tag in &payload.tags {
        conn.execute(
            "INSERT OR IGNORE INTO trade_tags (trade_id, tag) VALUES (?1, ?2)",
            params![payload.id, tag],
        )?;
    }

    Ok(payload)
}

pub fn list_trades(conn: &Connection) -> Result<Vec<TradeRecord>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, session_id, account, instrument, custom_instrument, side, entry_timestamp, exit_timestamp,
               entry_price, exit_price, contracts, stop_loss, take_profit,
               gross_pnl, net_pnl, commission, r_multiple, mae, mfe, hold_minutes, execution_count, mood, setup_description
        FROM trades
        ORDER BY entry_timestamp DESC
        "#,
    )?;

    let trade_iter = stmt.query_map([], |row| {
        Ok(TradeRecord {
            id: row.get(0)?,
            session_id: row.get(1)?,
            account: row.get(2)?,
            instrument: instrument_from_str(&row.get::<_, String>(3)?),
            custom_instrument: row.get(4)?,
            side: side_from_str(&row.get::<_, String>(5)?),
            entry_timestamp: row.get(6)?,
            exit_timestamp: row.get(7)?,
            entry_price: row.get(8)?,
            exit_price: row.get(9)?,
            contracts: row.get(10)?,
            stop_loss: row.get(11)?,
            take_profit: row.get(12)?,
            gross_pnl: row.get(13)?,
            net_pnl: row.get(14)?,
            commission: row.get(15)?,
            r_multiple: row.get(16)?,
            mae: row.get(17)?,
            mfe: row.get(18)?,
            hold_minutes: row.get(19)?,
            execution_count: row.get(20)?,
            mood: row.get(21)?,
            setup_description: row.get(22)?,
            tags: Vec::new(),
            images: Vec::new(),
            session_images: Vec::new(),
        })
    })?;

    let mut trades = Vec::new();
    for trade in trade_iter {
        let mut trade = trade?;
        trade.tags = fetch_tags(conn, &trade.id)?;
        trade.images = fetch_images(conn, &trade.id)?;
        trade.session_images = fetch_session_images(conn, &trade.session_id)?;
        trades.push(trade);
    }

    Ok(trades)
}

pub fn get_dashboard_metrics(conn: &Connection) -> Result<DashboardMetrics> {
    let trades = list_trades(conn)?;
    let trade_count = trades.len() as i64;
    let wins: Vec<_> = trades.iter().filter(|trade| trade.net_pnl > 0.0).collect();
    let losses: Vec<_> = trades.iter().filter(|trade| trade.net_pnl < 0.0).collect();
    let gross_profit: f64 = wins.iter().map(|trade| trade.net_pnl).sum();
    let gross_loss: f64 = losses.iter().map(|trade| trade.net_pnl.abs()).sum();
    let total_pnl: f64 = trades.iter().map(|trade| trade.net_pnl).sum();

    let mut running: f64 = 0.0;
    let mut peak: f64 = 0.0;
    let mut max_drawdown: f64 = 0.0;
    let mut chronological = trades.clone();
    chronological.reverse();
    let equity_curve = chronological
        .iter()
        .map(|trade| {
            running += trade.net_pnl;
            peak = peak.max(running);
            max_drawdown = max_drawdown.min(running - peak);
            SeriesPoint {
                label: trade.exit_timestamp.clone(),
                balance: running,
            }
        })
        .collect::<Vec<_>>();

    let weekday_heatmap = build_weekday_heatmap(&trades);
    let tag_stats = build_tag_stats(&trades);

    Ok(DashboardMetrics {
        account_balance: total_pnl,
        equity_curve,
        win_rate: if trade_count == 0 {
            0.0
        } else {
            wins.len() as f64 / trade_count as f64 * 100.0
        },
        average_win: if wins.is_empty() { 0.0 } else { gross_profit / wins.len() as f64 },
        average_loss: if losses.is_empty() { 0.0 } else { -gross_loss / losses.len() as f64 },
        profit_factor: if gross_loss == 0.0 { gross_profit } else { gross_profit / gross_loss },
        expectancy: if trade_count == 0 { 0.0 } else { total_pnl / trade_count as f64 },
        trade_count,
        max_drawdown,
        mae_mfe: trades
            .iter()
            .map(|trade| MaeMfePoint {
                trade_id: trade.id.clone(),
                mae: trade.mae.unwrap_or_default(),
                mfe: trade.mfe.unwrap_or_default(),
                pnl: trade.net_pnl,
            })
            .collect(),
        weekday_heatmap,
        tag_stats,
    })
}

fn fetch_tags(conn: &Connection, trade_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT tag FROM trade_tags WHERE trade_id = ?1 ORDER BY tag")?;
    let rows = stmt.query_map(params![trade_id], |row| row.get(0))?;
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row?);
    }
    Ok(tags)
}

fn read_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1 LIMIT 1")?;
    let value = stmt.query_row(params![key], |row| row.get(0)).optional()?;
    Ok(value)
}

fn write_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![key, value],
    )?;
    Ok(())
}

fn seed_default_tags(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM tag_definitions", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let defaults = [
        ("FOMO", "#ef4444"),
        ("Orderflow Confirmation", "#22c55e"),
        ("News Event", "#f59e0b"),
        ("A+ Setup", "#38bdf8"),
        ("Overtrading", "#a78bfa"),
    ];

    for (name, color) in defaults {
        conn.execute(
            "INSERT INTO tag_definitions (id, name, color) VALUES (?1, ?2, ?3)",
            params![Uuid::new_v4().to_string(), name, color],
        )?;
    }

    Ok(())
}

fn fetch_images(conn: &Connection, trade_id: &str) -> Result<Vec<TradeImage>> {
    let mut stmt = conn.prepare(
        "SELECT id, trade_id, relative_path, description FROM trade_images WHERE trade_id = ?1 ORDER BY created_at",
    )?;
    let rows = stmt.query_map(params![trade_id], |row| {
        Ok(TradeImage {
            id: row.get(0)?,
            trade_id: row.get(1)?,
            relative_path: row.get(2)?,
            description: row.get(3)?,
        })
    })?;
    let mut images = Vec::new();
    for row in rows {
        images.push(row?);
    }
    Ok(images)
}

fn fetch_session_images(conn: &Connection, session_id: &str) -> Result<Vec<TradeImage>> {
    if session_id.is_empty() {
        return Ok(Vec::new());
    }
    let mut stmt = conn.prepare(
        "SELECT id, session_id, relative_path, description FROM session_images WHERE session_id = ?1 ORDER BY created_at",
    )?;
    let rows = stmt.query_map(params![session_id], |row| {
        Ok(TradeImage {
            id: row.get(0)?,
            trade_id: row.get(1)?,
            relative_path: row.get(2)?,
            description: row.get(3)?,
        })
    })?;
    let mut images = Vec::new();
    for row in rows {
        images.push(row?);
    }
    Ok(images)
}

fn build_weekday_heatmap(trades: &[TradeRecord]) -> Vec<HeatmapPoint> {
    let mut buckets = std::collections::BTreeMap::<String, f64>::new();
    for trade in trades {
        if let Ok(parsed) = DateTime::parse_from_rfc3339(&trade.entry_timestamp) {
            let label = format!(
                "{} {:02}:00",
                parsed.weekday(),
                parsed.hour()
            );
            *buckets.entry(label).or_default() += trade.net_pnl;
        }
    }
    buckets
        .into_iter()
        .take(12)
        .map(|(bucket, value)| HeatmapPoint { bucket, value })
        .collect()
}

fn build_tag_stats(trades: &[TradeRecord]) -> Vec<TagStat> {
    let mut totals = std::collections::HashMap::<String, (i64, f64)>::new();
    for trade in trades {
        for tag in &trade.tags {
            let entry = totals.entry(tag.clone()).or_insert((0, 0.0));
            entry.0 += 1;
            entry.1 += trade.net_pnl;
        }
    }
    let mut stats = totals
        .into_iter()
        .map(|(label, (count, pnl))| TagStat { label, count, pnl })
        .collect::<Vec<_>>();
    stats.sort_by(|a, b| b.count.cmp(&a.count));
    stats.truncate(8);
    stats
}

pub fn from_partial_trade(payload: serde_json::Value) -> Result<TradeRecord> {
    let entry_timestamp = normalize_timestamp_input(
        payload
        .get("entryTimestamp")
        .and_then(|value| value.as_str())
        .unwrap_or(""),
    );
    let exit_timestamp = normalize_timestamp_input(
        payload
        .get("exitTimestamp")
        .and_then(|value| value.as_str())
        .unwrap_or(""),
    );
    let entry_price = payload.get("entryPrice").and_then(|value| value.as_f64()).unwrap_or_default();
    let exit_price = payload.get("exitPrice").and_then(|value| value.as_f64()).unwrap_or_default();
    let contracts = payload.get("contracts").and_then(|value| value.as_i64()).unwrap_or(1);
    let stop_loss = payload.get("stopLoss").and_then(|value| value.as_f64());
    let calculated_gross_pnl = match payload.get("side").and_then(|value| value.as_str()).unwrap_or("LONG") {
        "SHORT" => (entry_price - exit_price) * contracts as f64,
        _ => (exit_price - entry_price) * contracts as f64,
    };
    let gross_pnl = payload
        .get("grossPnl")
        .and_then(|value| value.as_f64())
        .unwrap_or(calculated_gross_pnl);
    let commission = payload
        .get("commission")
        .and_then(|value| value.as_f64())
        .unwrap_or_default();
    let net_pnl = payload
        .get("netPnl")
        .and_then(|value| value.as_f64())
        .unwrap_or(gross_pnl - commission);
    let calculated_risk = stop_loss
        .map(|value| ((entry_price - value).abs() * contracts as f64).max(0.01))
        .unwrap_or(1.0);
    let r_multiple = payload
        .get("rMultiple")
        .and_then(|value| value.as_f64())
        .unwrap_or(net_pnl / calculated_risk);
    let hold_minutes = payload
        .get("holdMinutes")
        .and_then(|value| value.as_i64())
        .unwrap_or_else(|| parse_hold_minutes(&entry_timestamp, &exit_timestamp));

    Ok(TradeRecord {
        id: payload
            .get("id")
            .and_then(|value| value.as_str())
            .map(ToString::to_string)
            .unwrap_or_else(|| Uuid::new_v4().to_string()),
        session_id: payload
            .get("sessionId")
            .and_then(|value| value.as_str())
            .map(ToString::to_string)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| default_session_id(&entry_timestamp)),
        account: payload
            .get("account")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        instrument: instrument_from_str(payload.get("instrument").and_then(|value| value.as_str()).unwrap_or("ES")),
        custom_instrument: payload
            .get("customInstrument")
            .and_then(|value| value.as_str())
            .map(ToString::to_string),
        side: side_from_str(payload.get("side").and_then(|value| value.as_str()).unwrap_or("LONG")),
        entry_timestamp,
        exit_timestamp,
        entry_price,
        exit_price,
        contracts,
        stop_loss,
        take_profit: payload.get("takeProfit").and_then(|value| value.as_f64()),
        gross_pnl,
        net_pnl,
        commission,
        r_multiple,
        mae: payload.get("mae").and_then(|value| value.as_f64()),
        mfe: payload.get("mfe").and_then(|value| value.as_f64()),
        hold_minutes,
        execution_count: payload
            .get("executionCount")
            .and_then(|value| value.as_i64())
            .unwrap_or_default(),
        mood: payload.get("mood").and_then(|value| value.as_str()).unwrap_or("🙂").to_string(),
        setup_description: payload
            .get("setupDescription")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        tags: payload
            .get("tags")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(ToString::to_string))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
        images: vec![],
        session_images: vec![],
    })
}

fn parse_hold_minutes(entry: &str, exit: &str) -> i64 {
    let entry_dt = parse_timestamp(entry);
    let exit_dt = parse_timestamp(exit);
    match (entry_dt, exit_dt) {
        (Some(start), Some(end)) => (end - start).num_minutes().max(0),
        _ => 0,
    }
}

fn parse_timestamp(input: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(input)
        .map(|value| value.with_timezone(&Utc))
        .ok()
        .or_else(|| {
            NaiveDateTime::parse_from_str(input, "%Y-%m-%dT%H:%M")
                .ok()
                .and_then(|value| Utc.from_local_datetime(&value).single())
        })
        .or_else(|| {
            NaiveDateTime::parse_from_str(input, "%Y-%m-%d %H:%M:%S")
                .ok()
                .and_then(|value| Utc.from_local_datetime(&value).single())
        })
}

fn normalize_timestamp_input(input: &str) -> String {
    parse_timestamp(input)
        .unwrap_or_else(Utc::now)
        .to_rfc3339()
}

fn default_session_id(entry_timestamp: &str) -> String {
    if let Some(parsed) = parse_timestamp(entry_timestamp) {
        return format!("{}-01", parsed.format("%Y-%m-%d"));
    }
    format!("{}-01", Utc::now().format("%Y-%m-%d"))
}

fn ensure_trade_session_column(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(trades)")?;
    let mut rows = stmt.query([])?;
    let mut columns = std::collections::HashSet::new();
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        columns.insert(name);
    }

    if !columns.contains("session_id") {
        conn.execute("ALTER TABLE trades ADD COLUMN session_id TEXT NOT NULL DEFAULT ''", [])?;
    }
    if !columns.contains("account") {
        conn.execute("ALTER TABLE trades ADD COLUMN account TEXT NOT NULL DEFAULT ''", [])?;
    }
    if !columns.contains("commission") {
        conn.execute("ALTER TABLE trades ADD COLUMN commission REAL NOT NULL DEFAULT 0", [])?;
    }
    if !columns.contains("execution_count") {
        conn.execute("ALTER TABLE trades ADD COLUMN execution_count INTEGER NOT NULL DEFAULT 0", [])?;
    }

    Ok(())
}

fn instrument_to_str(value: &Instrument) -> &'static str {
    match value {
        Instrument::Es => "ES",
        Instrument::Nq => "NQ",
        Instrument::Mes => "MES",
        Instrument::Mnq => "MNQ",
        Instrument::Cl => "CL",
        Instrument::Mcl => "MCL",
        Instrument::Btcus => "BTCUS",
        Instrument::Custom => "CUSTOM",
    }
}

fn side_to_str(value: &Side) -> &'static str {
    match value {
        Side::Long => "LONG",
        Side::Short => "SHORT",
    }
}

fn instrument_from_str(value: &str) -> Instrument {
    match value {
        "NQ" => Instrument::Nq,
        "MES" => Instrument::Mes,
        "MNQ" => Instrument::Mnq,
        "CL" => Instrument::Cl,
        "MCL" => Instrument::Mcl,
        "BTCUS" => Instrument::Btcus,
        "CUSTOM" => Instrument::Custom,
        _ => Instrument::Es,
    }
}

fn side_from_str(value: &str) -> Side {
    match value {
        "SHORT" => Side::Short,
        _ => Side::Long,
    }
}
