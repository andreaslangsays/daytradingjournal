# Personal Trader Journal

Portable Tauri 2.0 desktop app for offline trade journaling with a Rust backend, React/TypeScript frontend and SQLite storage.

## Stack

- Tauri 2.0
- Rust + `rusqlite`
- React 18 + TypeScript
- Tailwind CSS
- shadcn-style UI primitives

## Portable `.trj` format

The journal is designed as a portable archive with this structure:

```text
my-journal.trj
├── journal.sqlite
└── images/
    ├── *.webp
    └── ...
```

Open flow:

1. Pick a `.trj` archive.
2. Extract it into the protected app data workspace.
3. Open `journal.sqlite` locally.

Save flow:

1. Persist database changes locally.
2. Keep screenshots in `images/`.
3. Compress the workspace back into a `.trj` file.

## Features in this scaffold

- Typed SQLite schema for trades, tags and screenshots
- Rust commands for trade CRUD, dashboard metrics, CSV preview/import/export
- `.trj` archive unpacking/packing
- WebP screenshot conversion pipeline
- Dark-mode fintech UI with sidebar, Bento-style overview and analytics panels
- Search and filter trade history
- CSV mapper surface for broker exports

## Local setup

Rust is not currently installed in this workspace environment, so builds could not be executed here. After installing Rust, run:

```bash
npm install
rustup default stable
npm run tauri dev
```

For production bundles:

```bash
npm run tauri build
```

## Suggested next steps

- Add real shadcn CLI generated components once dependencies are installed
- Wire screenshot upload into the React trade form
- Add richer charts with a dedicated visualization library if desired
- Extend CSV mappings with saved broker presets
