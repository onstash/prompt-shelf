-- Proposed edits to a template from MCP clients (ADR-0010).
-- A proposal is immutable after creation. Only a browser approval can apply it.

CREATE TABLE template_update_proposals (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  base_version INTEGER NOT NULL,
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
  applied_version INTEGER
);

CREATE INDEX template_update_proposals_workspace_status_idx
  ON template_update_proposals(workspace_id, status);

CREATE INDEX template_update_proposals_template_idx
  ON template_update_proposals(template_id);
