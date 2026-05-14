# 📝 Doc Editor

A lightweight, local-first text editor with SQLite persistence, versioning, and encrypted backups.

## ✨ Features

- **Rich Document Management** — Create, edit, delete, and search documents in a clean two-pane interface.
- **Categories** — Organize documents into custom categories (To-Do, Personal, Misc, or your own).
- **Version History** — Automatically track document revisions. Preview, compare, and restore any past version (up to 50 per document).
- **Encrypted Export/Import** — Backup your entire document collection with AES-256 encryption (or XOR fallback for older browsers). Restore on demand with duplicate detection.
- **18 Themes** — Switch between 11 dark and 7 light themes including Tokyo Night, Nord, Dracula, Catppuccin, Gruvbox, and more. Your preference is saved in `localStorage`.
- **Auto-Save** — Documents are saved after 10 seconds of idle time. A status indicator shows save state (🟢 saved, ⏳ saving, 🟡 unsaved).
- **Undo/Redo** — Client-side undo/redo with up to 200 history steps and a 5-minute reset window.
- **Keyboard Shortcuts**
  | Shortcut | Action |
  |---|---|
  | `Ctrl/Cmd + S` | Save current document |
  | `Ctrl/Cmd + Shift + S` | Save a manual version snapshot |
  | `Ctrl/Cmd + Z` | Undo |
  | `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` | Redo |
  | `Ctrl/Cmd + N` | New document |
  | `Ctrl/Cmd + B` | Toggle sidebar |
  | `Escape` | Close modals |
- **Last Document Restore** — Reopens your last-edited document on page load.
- **Content Security Policy** — Built-in CSP headers for safer deployment.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vue 3 SPA (dist/)                                  │
│  ┌──────────┬───────────────────────────────────┐   │
│  │  Sidebar │  Main Editor Area                  │   │
│  │  • Search│  • Title, Content, Category        │   │
│  │  • Filter│  • Save status indicator           │   │
│  │  • List  │  • Theme selector                  │   │
│  │  • Docs  │  • Keyboard shortcuts              │   │
│  └──────────┴───────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Express 5 Backend (server.cjs)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  REST API: /api/documents, /api/categories    │  │
│  │  SPA Fallback: serves index.html              │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  SQLite Database (data/docs.db)                     │
│  • documents (title, content, category, timestamps) │
│  • categories (name)                               │
│  • document_versions (revision history, max 50)    │
└─────────────────────────────────────────────────────┘
```

## 🛠️ Technologies

| Layer | Technology |
|---|---|
| **Frontend** | Vue 3.5 (Composition API, `<script setup>`, SFCs) |
| **Build** | Vite 6 |
| **Backend** | Express 5 |
| **Database** | better-sqlite3 12 (SQLite 3) |
| **Encryption** | Web Crypto API (AES-256-GCM) with XOR fallback |
| **Styling** | CSS custom properties, 18 theme color schemes |
| **Deployment** | Multi-stage Docker build |

### Packages

**Dependencies**
- `vue` (^3.5.13) — UI framework
- `express` (^5.2.1) — HTTP server
- `better-sqlite3` (^12.10.0) — SQLite database engine

**Dev Dependencies**
- `vite` (^6.3.5) — Build tool & dev server
- `@vitejs/plugin-vue` (^5.2.3) — Vite plugin for Vue SFCs
- `concurrently` (^9.1.2) — Run dev server + backend simultaneously

## 🚀 Quick Start

### Docker (Recommended)

#### Single Container
```bash
docker run -d \
  --name doc-editor \
  -p 8040:8040 \
  -v doc-data:/app/data \
  ghcr.io/jeditec/doc-editor:latest
```

#### Docker Compose

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

#### Build Locally
```bash
docker compose build
docker compose up -d
```

### Local Development

```bash
# Install dependencies
pnpm install

# Run dev server (Vite HMR) + Express backend concurrently
pnpm run start:full
```

Then open **http://localhost:5173** (Vite dev server with proxy to Express on :8040).

### Production (without Docker)

```bash
# Build the frontend
pnpm run build

# Start the server
pnpm start
```

Or run `start.sh` which auto-builds if needed:

```bash
chmod +x start.sh && ./start.sh
```

Access at **http://localhost:8040**.

## 📂 Project Structure

```
doc-editor/
├── server.cjs                  # Express backend + SQLite + REST API
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite config (API proxy, build settings)
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose setup
├── start.sh                    # Auto-build + launch script
├── .npmrc                      # Allow native builds for better-sqlite3
│
├── index.html                  # SPA entry point (served by Express)
├── dist/                       # Production build output
│
├── data/                       # SQLite database directory (docker volume)
│   └── docs.db                 # Database file
│
└── src/                        # Vue 3 frontend source
    ├── main.js                 # App entrypoint
    ├── App.vue                 # Root component
    ├── App.css                 # Global layout styles
    ├── theme-styles.css        # All 18 theme color definitions
    │
    ├── components/             # Vue SFC components
    │   ├── Sidebar.vue         # Left panel (search, categories, docs)
    │   ├── DocumentList.vue    # Scrollable document list
    │   ├── CategoryFilters.vue # Category filter buttons
    │   ├── Editor.vue          # Main editor with toolbar
    │   ├── WelcomeScreen.vue   # Empty state screen
    │   │
    │   └── modals/             # Modal dialogs
    │       ├── DeleteModal.vue
    │       ├── CategoryModal.vue
    │       ├── DeleteCategoryModal.vue
    │       ├── ExportModal.vue
    │       ├── ImportModal.vue
    │       ├── PasswordModal.vue
    │       ├── VersionHistoryModal.vue
    │       ├── VersionPreviewModal.vue
    │       └── CompareModal.vue
    │
    └── composables/            # Vue composition functions
        ├── useDocuments.js     # CRUD operations & version history
        ├── useCategories.js    # Category management
        ├── useThemes.js        # Theme switching (18 themes)
        ├── useEncryption.js    # AES-256 / XOR encrypt & decrypt
        └── useUndoRedo.js      # Client-side undo/redo stack
```

## 🔐 Encryption Details

Export and import use **AES-256-GCM** with PBKDF2 key derivation (100,000 iterations, 16-byte salt). On browsers without `crypto.subtle` support, a simpler XOR-based scheme is used as fallback. The encryption mode is indicated in the exported file extension: `.AES-256.enc` or `.XOR.enc`.

## 🐛 Troubleshooting

| Issue | Solution |
|---|---|
| `better-sqlite3` native build fails in Docker | Ensure `build-essential` and `python3` are installed in the runtime stage (included in the Dockerfile) |
| API routes return HTML instead of JSON | The SPA fallback excludes `/api` and `/assets` paths — ensure your proxy doesn't interfere |
| Theme doesn't persist | Check `localStorage` is not blocked (e.g., private browsing mode) |
| Version history is empty | Versions are only saved when `Ctrl+Shift+S` is used, or when the auto-save detects a change and `save_version` is triggered |
