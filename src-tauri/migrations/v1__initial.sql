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
