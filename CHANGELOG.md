# Changelog

## 0.1.2 - 2026-03-27

### Added
- Edit flow for existing journal entries directly from the trade detail panel.

### Changed
- Desktop feeling tightened with harder edges and a maximum corner radius of roughly `5px`.
- Layout density increased across cards, controls, badges and detail surfaces.
- Sidebar behavior refined to stay fixed and use the full vertical viewport height.

### Fixed
- Contrast issues across light and dark mode in several high-traffic surfaces.
- Lightbox detail controls, especially the close action, for better readability.
- Trade detail image behavior after switching across entries and screenshots.

## 0.1.1 - 2026-03-27

### Added
- Portable `.trj` journal workflow with SQLite database and archived image assets.
- Multilingual UI with German, English and Spanish support.
- Persistent application settings for language, theme and active view.
- Trade and session screenshot support via paste and file dialog.
- Session-based trade grouping with session screenshots in history and fullscreen review.
- CSV import/export surface and tag management in settings.

### Changed
- App renamed to `Personal Trader Journal`.
- UI redesigned toward a denser terminal-style fintech layout.
- Navigation moved into a fixed left sidebar with compact top bar actions.
- Dashboard split into overview and statistics views with Bento-style analytical tiles.
- Trade capture form reorganized into a denser multi-column layout with compact controls.
- Light and dark themes refined with better contrast and reduced visual noise.

### Fixed
- Screenshot rendering in trade detail/lightbox after switching between trades.
- Light mode heading contrast across major surfaces.
- Sidebar behavior to better use vertical screen space.
