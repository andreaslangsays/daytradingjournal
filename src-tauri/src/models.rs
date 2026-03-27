use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Instrument {
    Es,
    Nq,
    Cl,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Side {
    Long,
    Short,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TradeImage {
    pub id: String,
    pub trade_id: String,
    pub relative_path: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TradeRecord {
    pub id: String,
    pub session_id: String,
    pub instrument: Instrument,
    pub custom_instrument: Option<String>,
    pub side: Side,
    pub entry_timestamp: String,
    pub exit_timestamp: String,
    pub entry_price: f64,
    pub exit_price: f64,
    pub contracts: i64,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
    pub gross_pnl: f64,
    pub net_pnl: f64,
    pub r_multiple: f64,
    pub mae: Option<f64>,
    pub mfe: Option<f64>,
    pub hold_minutes: i64,
    pub mood: String,
    pub setup_description: String,
    pub tags: Vec<String>,
    pub images: Vec<TradeImage>,
    pub session_images: Vec<TradeImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMetrics {
    pub account_balance: f64,
    pub equity_curve: Vec<SeriesPoint>,
    pub win_rate: f64,
    pub average_win: f64,
    pub average_loss: f64,
    pub profit_factor: f64,
    pub expectancy: f64,
    pub trade_count: i64,
    pub max_drawdown: f64,
    pub mae_mfe: Vec<MaeMfePoint>,
    pub weekday_heatmap: Vec<HeatmapPoint>,
    pub tag_stats: Vec<TagStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesPoint {
    pub label: String,
    pub balance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaeMfePoint {
    pub trade_id: String,
    pub mae: f64,
    pub mfe: f64,
    pub pnl: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapPoint {
    pub bucket: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagStat {
    pub label: String,
    pub count: i64,
    pub pnl: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CsvPreview {
    pub headers: Vec<String>,
    pub sample_rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDefinition {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub language: String,
    pub active_tab: String,
    pub theme: String,
}

pub type CsvMapping = std::collections::HashMap<String, String>;
