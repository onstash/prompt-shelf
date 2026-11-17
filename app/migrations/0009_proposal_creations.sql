-- Proposals can now create a template as well as update one (ADR-0010).
-- A creation has no template yet, so template_id and base_version are nullable for it.
-- SQLite cannot relax constraints in place, so the table is rebuilt and existing rows are kept.

DROP INDEX template_update_proposals_workspace_status_idx;
DROP INDEX template_update_proposals_template_idx;

ALTER TABLE template_update_proposals RENAME TO template_update_proposals_old;

CREATE TABLE template_update_proposals (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update', 'create')),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES templates(id) ON DELETE CASCADE,
  base_version INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  body TEXT NOT NULL,
  fields_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'conflict')),
  created_by_client_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  decided_at TEXT,
  applied_version INTEGER,
  applied_template_id TEXT,
  CHECK (
    (kind = 'update' AND template_id IS NOT NULL AND base_version IS NOT NULL)
    OR (kind = 'create' AND template_id IS NULL AND base_version IS NULL)
  )
);

INSERT INTO template_update_proposals (
  id, kind, workspace_id, template_id, base_version, title, description, category, body,
  fields_json, status, created_by_client_id, created_at, decided_by_user_id, decided_at, applied_version
)
SELECT
  id, 'update', workspace_id, template_id, base_version, title, description, category, body,
  fields_json, status, created_by_client_id, created_at, decided_by_user_id, decided_at, applied_version
FROM template_update_proposals_old;

DROP TABLE template_update_proposals_old;

CREATE INDEX template_update_proposals_workspace_status_idx
  ON template_update_proposals(workspace_id, status);

CREATE INDEX template_update_proposals_template_idx
  ON template_update_proposals(template_id);
