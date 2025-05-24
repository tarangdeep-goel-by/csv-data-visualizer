# Versioning & Data Snapshot Feature

## Overview
This branch implements robust version management for the data analysis/visualization tool. It allows users to:
- Save versions of their data view (including filters and metadata)
- Store a snapshot of the filtered data for each version
- Restore any version, even after uploading new files
- Maintain separate version histories for each uploaded file (using `parent_id`)

## Key Features
- **Data Snapshots:** Each version saves a filtered snapshot of the data as a CSV. Loading a version restores this snapshot as the active data file.
- **Metadata Restoration:** When a version is loaded, its metadata (column classifications, dimension flags) is also restored.
- **Parent ID Scoping:** Each file upload generates a unique `parent_id`. Version history and actions are scoped to this ID, so only relevant versions are shown for each file.
- **Robust API:** All versioning actions are available via REST endpoints, and are fully tested.

## API Endpoints

### File Upload
- `POST /upload` — Upload a CSV file. Returns metadata and a new `parent_id`.

### Version Management
- `POST /versions/save?parent_id=...` — Save a version for the current file and filters.
- `GET /versions/list?parent_id=...` — List all versions for the current file.
- `POST /versions/{version_id}/activate` — Restore a version's snapshot as the current data file and metadata.
- `POST /versions/{version_id}/load` — Get a version's filter criteria and metadata (for UI display).
- `DELETE /versions/{version_id}` — Delete a version.

### Data & Metadata
- `POST /data/filter` — Filter and aggregate the current (active) data file.
- `GET /metadata` — Get metadata for the current (active) data file.

## Frontend Flow
1. **Upload a file:** UI receives a `parent_id` and uses it for all versioning actions.
2. **Save a version:** UI calls `/versions/save?parent_id=...` with current filters.
3. **List versions:** UI calls `/versions/list?parent_id=...` to show only relevant versions.
4. **Load a version:** UI calls `/versions/{version_id}/activate` to restore the snapshot, then fetches `/metadata` and `/data/filter` to refresh the UI.
5. **Upload a new file:** UI receives a new `parent_id`, resets version state, and starts a new version history.

## Testing
Automated tests are provided in `backend/tests/test_versioning.py` using pytest and FastAPI's TestClient. These cover:
- Uploading files and receiving `parent_id`
- Saving, listing, loading, and deleting versions
- Activating a version and verifying data/metadata restoration
- Error cases (missing snapshot, invalid parent_id, etc.)

### To run the tests:
```sh
cd backend
pytest tests/test_versioning.py
```

## Review & Merge
- Please use this README and the test suite to validate the versioning feature.
- Do **not** merge into `main` until all versioning issues are resolved and tests pass.

---
For questions or issues, contact the feature author or open an issue on this branch. 