# Personal Trader Journal

Personal Trader Journal is an offline-first desktop application for structured trade review, screenshot-based journaling and performance analysis. It is built with Tauri 2.0, a Rust backend, a React/TypeScript frontend and a local SQLite database packed into a portable `.trj` workspace archive.

## Highlights

- Fully local journal with no cloud dependency
- Portable `.trj` archive format for database and screenshots
- ATAS `.xlsx` import based on `Journal` and `Executions`
- Trade and session screenshots with automatic WebP compression
- Multilingual UI: German, English, Spanish
- Persistent preferences for language, theme and fee presets
- Terminal-style desktop layout with dense analytics and fullscreen trade review

## Architecture

### Frontend

- React 18
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives

Main frontend areas:

- [App.tsx](/Users/andreas/Code/tradingjournal/src/App.tsx): app orchestration, persistence, journal open/save flow
- [trade-history.tsx](/Users/andreas/Code/tradingjournal/src/components/trade-history.tsx): trade list, detail panel and fullscreen review
- [trade-form.tsx](/Users/andreas/Code/tradingjournal/src/components/trade-form.tsx): capture and editing flow
- [dashboard.tsx](/Users/andreas/Code/tradingjournal/src/components/dashboard.tsx): overview and statistics
- [settings-screen.tsx](/Users/andreas/Code/tradingjournal/src/components/settings-screen.tsx): language, theme, tags, fee presets and system actions

### Backend

- Rust
- Tauri 2.0
- `rusqlite`
- `calamine`
- `image`

Main backend areas:

- [lib.rs](/Users/andreas/Code/tradingjournal/src-tauri/src/lib.rs): Tauri commands, ATAS import/export, screenshot commands
- [db.rs](/Users/andreas/Code/tradingjournal/src-tauri/src/db.rs): schema, migrations, queries, dashboard metrics
- [archive.rs](/Users/andreas/Code/tradingjournal/src-tauri/src/archive.rs): `.trj` extract/pack and WebP conversion
- [models.rs](/Users/andreas/Code/tradingjournal/src-tauri/src/models.rs): typed Rust models

## Portable `.trj` format

Each journal is stored as a ZIP-based archive with `.trj` extension:

```text
my-journal.trj
├── journal.sqlite
└── images/
    ├── *.webp
    └── ...
```

Open flow:

1. Select a `.trj` file.
2. Extract it into the protected application workspace.
3. Open the local `journal.sqlite`.
4. Read screenshots from the unpacked `images/` directory.

Save flow:

1. Persist current trade, tag and settings state locally.
2. Keep screenshots inside `images/`.
3. Rebuild the archive to the selected `.trj` target.

## Features

### Journal and capture

- Trade entry and editing
- Session grouping via `YYYY-MM-DD-XX`
- Trade screenshots and session screenshots
- Mood tracking with emoji states
- Tag catalog with persistent colors
- Account-aware trades and account filtering
- Per-trade commission support
- Persistent default commission presets per instrument

### Instruments

Supported presets currently include:

- `ES`
- `NQ`
- `MES`
- `MNQ`
- `CL`
- `MCL`
- `BTCUS`
- `CUSTOM`

### Analytics

- Equity curve
- Win rate, profit factor and expectancy
- MAE/MFE scatter data
- Time-based heatmap
- Tag statistics
- Session-aware fullscreen trade review

### Import and export

- ATAS Excel import from `Journal`
- Execution-aware import enrichment from `Executions`
- CSV flat export including account, session, commission and execution count

## ATAS import notes

The current importer is intentionally optimized for ATAS and expects an `.xlsx` workbook with at least:

- `Journal`
- `Executions`

Imported values include:

- account
- instrument
- open and close timestamps
- entry and exit prices
- side
- contracts
- PnL
- comment
- execution-derived commission
- execution count

`Executions` is used to improve post-import statistics by attaching fill count and commission totals to each trade window.

## Project structure

```text
tradingjournal/
├── src/
│   ├── components/
│   ├── lib/
│   ├── App.tsx
│   └── index.css
├── src-tauri/
│   ├── capabilities/
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── dist/
├── package.json
└── README.md
```

## Prerequisites

Install the following before building:

- Node.js 20+ and npm
- Rust stable toolchain
- Platform-specific native build tools

Recommended:

```bash
rustup default stable
rustup update
```

## Development

Install dependencies:

```bash
cd /Users/andreas/Code/tradingjournal
npm install
```

Run the desktop app in development mode:

```bash
npm run tauri dev
```

Useful verification commands:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```

## Build instructions by operating system

### macOS

Supported targets:

- Intel
- Apple Silicon

Prerequisites:

- Xcode Command Line Tools
- Rust stable
- Node.js 20+

Install Xcode command line tools if needed:

```bash
xcode-select --install
```

Build:

```bash
cd /Users/andreas/Code/tradingjournal
npm install
npm run tauri build
```

Output:

- App bundle: [Personal Trader Journal.app](/Users/andreas/Code/tradingjournal/src-tauri/target/release/bundle/macos/Personal%20Trader%20Journal.app)

Notes:

- The `.app` build is the primary artifact.
- On this project, the DMG step may still depend on local macOS bundling quirks and should be treated separately from the `.app` bundle itself.

### Windows 11

Prerequisites:

- Microsoft Visual Studio Build Tools 2022 with C++ workload
- WebView2 runtime
- Rust stable with MSVC target
- Node.js 20+

Recommended Rust target:

```bash
rustup target add x86_64-pc-windows-msvc
```

Build:

```powershell
cd C:\path\to\tradingjournal
npm install
npm run tauri build
```

Typical output:

- `.exe` installer or bundle in `src-tauri\target\release\bundle\`

Notes:

- Build from a regular PowerShell or Developer PowerShell.
- Ensure WebView2 is available on the system used for testing.

### Linux

Tested conceptually for modern desktop distributions. Required packages vary slightly by distro.

Common prerequisites:

- `build-essential`
- `pkg-config`
- `libgtk-3-dev`
- `libayatana-appindicator3-dev` or `libappindicator3-dev`
- `librsvg2-dev`
- `patchelf`
- Rust stable
- Node.js 20+

Ubuntu or Debian example:

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

Build:

```bash
cd /path/to/tradingjournal
npm install
npm run tauri build
```

Typical output:

- AppImage, `.deb` or other Linux bundle artifacts in `src-tauri/target/release/bundle/`

## Troubleshooting

### Build fails in Rust

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

If this fails, verify:

- Rust is installed and up to date
- native OS build tools are installed
- no stale lockfile or target-cache issue is masking the real error

### Frontend build fails

Run:

```bash
npm run build
```

If this fails, verify:

- Node.js version is current enough
- `npm install` completed successfully
- Tauri plugin APIs used in the frontend match installed versions

### File dialogs do not open

The project uses Tauri 2 capability permissions. Check:

- [default.json](/Users/andreas/Code/tradingjournal/src-tauri/capabilities/default.json)

Required dialog permissions include:

- `dialog:allow-open`
- `dialog:allow-save`

## Current release workflow

Typical local release sequence:

```bash
cd /Users/andreas/Code/tradingjournal
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
git status
git add -A
git commit -m "Release x.y.z"
git push
```

## Roadmap ideas

- richer execution analytics from ATAS fills
- more broker/import profiles beyond ATAS
- screenshot annotation or markup
- more configurable dashboard filters and saved views
