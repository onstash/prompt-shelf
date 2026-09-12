CREATE TABLE product_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (
    event_name IN ('template_opened', 'form_started', 'prompt_copied', 'template_created')
  ),
  template_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX product_events_name_created_at_idx
  ON product_events(event_name, created_at);
CREATE INDEX product_events_workspace_created_at_idx
  ON product_events(workspace_id, created_at);
