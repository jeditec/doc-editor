# 📝 Doc Editor — REST API Reference

All API endpoints are relative to `http://localhost:8040/api` (or the host configured via `PORT`).  
The backend is an Express 5 server backed by a SQLite database (`data/docs.db`).

---

## Table of Contents

- [Documents](#documents)
- [Categories](#categories)
- [Export / Import](#export--import)
- [Data Models](#data-models)
- [Error Responses](#error-responses)

---

## Documents

### `GET /api/documents`

List all documents with optional filtering.

**Query Parameters**

| Param     | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `category`| string | No       | Filter by category. Use `"all"` to reset filter. |
| `search`  | string | No       | Search title and content (`LIKE '%...%`       |

**Response** — `200 OK` — `Document[]`

```json
[
  {
    "id": 1,
    "title": "Meeting Notes",
    "content": "Discuss Q3 roadmap...",
    "category": "Personal",
    "created_at": "2026-05-14T10:00:00.000Z",
    "updated_at": "2026-05-14T14:30:00.000Z"
  }
]
```

---

### `GET /api/documents/:id`

Get a single document by ID.

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Response** — `200 OK` — `Document`

**Error** — `404 Not Found`

```json
{ "error": "Document not found" }
```

---

### `POST /api/documents`

Create a new document.

**Request Body**

```json
{
  "title": "New Document",
  "content": "Hello world",
  "category": "to-do"
}
```

| Field     | Type   | Default           |
|-----------|--------|-------------------|
| `title`   | string | `"Untitled Document"` |
| `content` | string | `""`              |
| `category`| string | `null`            |

**Response** — `201 Created` — `Document`

---

### `PUT /api/documents/:id`

Update a document. Only the fields present in the request body are updated.

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Request Body**

```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "category": "misc",
  "save_version": true
}
```

| Field          | Type    | Description                                                                 |
|----------------|---------|-----------------------------------------------------------------------------|
| `title`        | string  | New title (omit to keep unchanged)                                          |
| `content`      | string  | New content (omit to keep unchanged)                                        |
| `category`     | string  | New category. Empty string sets to `NULL`. Any other value is capitalized.  |
| `save_version` | boolean | If `true`, saves the current state to `document_versions` before updating.  |

**Response** — `200 OK` — `Document`

**Error** — `404 Not Found`

---

### `PATCH /api/documents/:id`

Truly partial update. Unlike `PUT`, the empty string `""` explicitly sets the field to `NULL` for `category`. No version is saved.

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Request Body** — subset of `{ title?, content?, category? }`

**Response** — `200 OK` — `Document`

---

### `DELETE /api/documents/:id`

Delete a document and all its versions.

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Response** — `200 OK` — `{ "ok": true }`

**Error** — `404 Not Found`

---

## Version History

### `POST /api/documents/:id/save-version`

Manually save a version snapshot without updating the document.

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Response** — `200 OK`

```json
{
  "ok": true,
  "versions": [
    {
      "id": 3,
      "document_id": 1,
      "title": "Old Title",
      "content": "Old content",
      "category": "Personal",
      "created_at": "2026-05-14T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/documents/:id/versions`

Get up to 50 version snapshots for a document (most recent first).

**Path Parameters**

| Param | Type   | Description   |
|-------|--------|---------------|
| `id`  | number | Document ID   |

**Response** — `200 OK` — `DocumentVersion[]`

---

### `POST /api/documents/:id/restore/:version_id`

Restore a document to a previous version.

**Path Parameters**

| Param       | Type   | Description       |
|-------------|--------|-------------------|
| `id`        | number | Document ID       |
| `version_id`| number | Version ID to restore |

**Response** — `200 OK` — `Document` (the restored document)

**Error** — `404 Not Found`

---

## Categories

### `GET /api/categories`

List all categories (sorted alphabetically, capitalized).

**Response** — `200 OK` — `string[]`

```json
["Personal", "To-Do", "Misc"]
```

---

### `POST /api/categories`

Create a new category. Duplicate names are silently ignored.

**Request Body**

```json
{ "name": "work" }
```

**Response** — `200 OK`

```json
{ "ok": true, "created": true }
```

If the category already exists:

```json
{ "ok": true, "created": false }
```

---

### `DELETE /api/categories/:name`

Delete a category. All documents in the category are set to `NULL` (shown under "All"). The `General` category cannot be deleted.

**Path Parameters**

| Param  | Type   | Description  |
|--------|--------|--------------|
| `name` | string | Category name (URL-encoded) |

**Response** — `200 OK` — `{ "ok": true }`

**Errors**

```json
{ "error": "Cannot delete the General category" }   // 400
{ "error": "Category not found" }                    // 404
```

---

## Export / Import

### `GET /api/export`

Export all documents as JSON.

**Response** — `200 OK` — `Document[]`

```json
[
  {
    "id": 1,
    "title": "Meeting Notes",
    "content": "Discuss Q3 roadmap...",
    "category": "Personal",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

> **Note:** Import is performed client-side. The frontend fetches all documents, encrypts them with AES-256-GCM (or XOR fallback), and triggers a browser download. Restore reads an encrypted `.enc` file, decrypts it, and POSTs any new documents to `/api/documents`.

---

## Data Models

### `Document`

```ts
interface Document {
  id: number;
  title: string;
  content: string;
  category: string | null;
  created_at: string;   // ISO datetime
  updated_at: string;   // ISO datetime
}
```

### `DocumentVersion`

```ts
interface DocumentVersion {
  id: number;
  document_id: number;
  title: string;
  content: string;
  category: string | null;
  created_at: string;   // ISO datetime
}
```

---

## Error Responses

All error responses use JSON with an `error` field:

| Status | Meaning            | Example                             |
|--------|--------------------|-------------------------------------|
| 400    | Bad Request        | `{ "error": "Category name required" }` |
| 404    | Not Found          | `{ "error": "Document not found" }`     |
| 500    | Internal Error     | `{ "error": "Internal server error" }`  |

---

## Client-Side Composables (Vue 3)

The frontend uses these Vue composition functions to interact with the API:

| Composable        | Purpose                                      |
|-------------------|----------------------------------------------|
| `useDocuments()`  | CRUD operations, version history, auto-save  |
| `useCategories()` | Fetch, create, and delete categories         |
| `useEncryption()` | AES-256-GCM / XOR encrypt & decrypt exports  |
| `useThemes()`     | Theme switching (18 themes via `localStorage`)|
| `useUndoRedo()`   | Client-side undo/redo (200 steps, 5-min reset)|

---

## Security & Deployment Notes

- **CSP:** A `Content-Security-Policy` header is set to restrict resources to `'self'` with `'unsafe-inline'` for scripts and styles (required by the Vue SPA).
- **API route isolation:** Express explicitly excludes `/api` and `/assets` from the SPA fallback, so API routes always return JSON.
- **Environment Variables:**
  | Variable       | Default             | Description                    |
  |----------------|---------------------|--------------------------------|
  | `PORT`         | `8040`              | Server listening port          |
  | `DOC_DB_DIR`   | `./data`            | Directory for the SQLite DB    |
