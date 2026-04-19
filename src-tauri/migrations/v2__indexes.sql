CREATE INDEX IF NOT EXISTS idx_trades_entry_timestamp ON trades(entry_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_exit_timestamp ON trades(exit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_session_id ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account);
CREATE INDEX IF NOT EXISTS idx_trades_instrument ON trades(instrument);
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag ON trade_tags(tag);
CREATE INDEX IF NOT EXISTS idx_trade_images_trade_id ON trade_images(trade_id);
CREATE INDEX IF NOT EXISTS idx_session_images_session_id ON session_images(session_id);
