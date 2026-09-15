CREATE TABLE saved_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  values_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id, template_version)
    REFERENCES template_revisions(template_id, version) ON DELETE CASCADE
);

CREATE INDEX saved_runs_workspace_created_at_idx
  ON saved_runs(workspace_id, created_at DESC);

CREATE INDEX saved_runs_template_revision_idx
  ON saved_runs(template_id, template_version);
