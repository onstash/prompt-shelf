CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE template_revisions (
  template_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  fields_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id, version),
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX template_revisions_template_id_idx
  ON template_revisions(template_id, version DESC);

INSERT INTO templates (id, title, description, category, current_version)
VALUES (
  'clear-first-draft',
  'Clear first draft',
  'Turn a rough idea into a clear, useful first draft without losing your own voice.',
  'Writing',
  3
);

INSERT INTO template_revisions (template_id, version, body, fields_json)
VALUES (
  'clear-first-draft',
  3,
  'You are a thoughtful writing partner.

Create a {{idea}} for {{audience}} in a {{tone}} voice. Keep it {{length}} and easy to scan.

Start with the clearest version of the idea, remove filler, and preserve the writer''s intent. Do not invent facts or make the tone sound generic.',
  '[{"key":"idea","label":"What are you writing?","type":"textarea","required":true},{"key":"audience","label":"Who is it for?","type":"text","required":true},{"key":"tone","label":"Tone","type":"select","options":["clear and conversational","warm and encouraging","direct and confident"]},{"key":"length","label":"Length","type":"select","options":["short and skimmable","a few useful paragraphs","detailed and thorough"]}]'
);
