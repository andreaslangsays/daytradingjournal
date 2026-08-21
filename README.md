# Personal Trader Journal 📈

Eine leistungsfähige, offline-first Desktop-Anwendung für Daytrader zur strukturierten Trade-Erfassung, Screenshot-basierten Review-Arbeit, automatischem Broker-Import und fundierter statistischer Performance-Analyse.

---

## 🎯 1. Ziel der App

- **Zweck**:
  - **Offline-First & Datenschutz**: 100% lokale Datenhaltung in portablen `.trj`-Archiven (SQLite-Datenbank + WebP-Screenshots) ohne Cloud-Zwang.
  - **Automatischer Broker-Import**: Nativer Import von ATAS `.xlsx`-Dateien (`Journal` und `Executions`).
  - **Screenshot-Management**: Automatische WebP-Kompression zur Speichereinsparung bei Chart-Snapshots und Session-Dokumentationen.
  - **Tiefgehende Performance-Analytics**: Winrate, Profit Factor, R-Multiple, Expectancy, Equity-Kurven und Drawdown-Analysen.
  - **Mehrsprachigkeit & Terminal-Design**: Vollständige Lokalisierung (Deutsch, Englisch, Spanisch) in einem hochgradig lesbaren, dichten Trader-Dashboard.
- **Betriebssystem (OS)**: macOS, Windows, Linux (Cross-Platform via Tauri 2.0).
- **Programmiersprachen & Stack**:
  - **Backend**: Rust, Tauri 2.0, `rusqlite`, `calamine` (Excel-Parser), `image` (WebP-Kompression).
  - **Frontend**: TypeScript, React 18, Tailwind CSS, Lucide Icons.

---

## 🛠️ 2. Kompilierung & Ausführung

### Voraussetzungen
- **Node.js** (v18+) & `npm`
- **Rust Toolchain** (`rustup` / `cargo`)
- System-Abhängigkeiten für Tauri (auf macOS: Xcode Command Line Tools)

### Installation & Entwicklungsmodus
```bash
cd /Users/andreas/Code/tradingjournal

# Node-Abhängigkeiten installieren
npm install

# App im Tauri-Entwicklungsmodus starten
npm run tauri dev
# oder
cargo tauri dev
```

### Produktions-Build erstellen
```bash
# Erstellt das native macOS-Bundle (.dmg / .app)
npm run tauri build
```
Das fertige Binary befindet sich anschließend unter `src-tauri/target/release/bundle/`.

---

## 🚀 3. Umsetzungsstand & Vision

### ✅ Aktueller Umsetzungsstand
- [x] **Portables `.trj`-Archiv**: Transaktionale SQLite-Speicherung mit eingebetteten Medien.
- [x] **ATAS-Excel-Import**: Vollständige Verarbeitung von Ausführungen und Journal-Tabellen.
- [x] **WebP-Screenshot-Pipeline**: Schnelle Bildaufnahme mit automatischer Komprimierung.
- [x] **Interaktives Dashboard**: Kennzahlen-Berechnung (`dashboard-metrics.ts`), Filter nach Zeitraum, Symbol und Setup.
- [x] **Fullscreen Trade Review**: Detaillierte Einzeltabellen- und Chartansicht zur Trade-Rekapitulation.
- [x] **Lokalisierung**: Umschalten zwischen Deutsch, Englisch und Spanisch.

### 🔮 Vision & Nächste Schritte
- [ ] **Erweiterte Broker-Schnittstellen**: Nativer Import für Interactive Brokers (Flex Query), TradeStation und NinjaTrader.
- [ ] **KI-gestützte Fehler- & Setup-Erkennung**: Statistische Erkennung von Verhaltensmustern (z. B. Overtrading, FOMO-Entries).
- [ ] **Monte-Carlo-Simulationen**: Risiko- und Zukunftsszenarien auf Basis der historischen Trade-Statistik.
- [ ] **Erweitertes Playbook**: Strukturierte Definition und Bewertung von Handelsstrategien und Regelkonformität.
