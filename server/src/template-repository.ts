export type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  required?: boolean;
  options?: string[];
};

export type Template = {
  id: string;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: Field[];
  version: number;
  updatedAt: string;
};

export type TemplateInput = Pick<
  Template,
  "title" | "description" | "category" | "body" | "fields"
>;

export interface TemplateRepository {
  list(workspaceId: string): Promise<Template[]>;
  find(workspaceId: string, id: string): Promise<Template | null>;
  create(workspaceId: string, template: Template): Promise<Template>;
  update(workspaceId: string, id: string, input: TemplateInput): Promise<Template | null>;
}

type TemplateRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  body: string;
  fields_json: string;
  version: number;
  updated_at: string;
};

const selectCurrentRevision = `
  SELECT t.id, t.title, t.description, t.category,
         r.body, r.fields_json, t.current_version AS version, t.updated_at
  FROM templates t
  JOIN template_revisions r
    ON r.template_id = t.id AND r.version = t.current_version
`;

function mapTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    body: row.body,
    // SAFETY: fields_json is written only from validated Template field arrays.
    fields: JSON.parse(row.fields_json) as Field[],
    version: row.version,
    updatedAt: row.updated_at,
  };
}

export class D1TemplateRepository implements TemplateRepository {
  constructor(private readonly db: D1Database) {}

  async list(workspaceId: string): Promise<Template[]> {
    const result = await this.db
      .prepare(
        `${selectCurrentRevision} WHERE t.workspace_id = ? OR t.workspace_id IS NULL ORDER BY t.updated_at DESC`,
      )
      .bind(workspaceId)
      .all<TemplateRow>();
    return result.results.map(mapTemplate);
  }

  async find(workspaceId: string, id: string): Promise<Template | null> {
    const row = await this.db
      .prepare(
        `${selectCurrentRevision} WHERE t.id = ? AND (t.workspace_id = ? OR t.workspace_id IS NULL)`,
      )
      .bind(id, workspaceId)
      .first<TemplateRow>();
    return row ? mapTemplate(row) : null;
  }

  async create(workspaceId: string, template: Template): Promise<Template> {
    await this.db.batch([
      this.db
        .prepare(`INSERT INTO templates (id, title, description, category, current_version, workspace_id)
                  VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(
          template.id,
          template.title,
          template.description,
          template.category,
          template.version,
          workspaceId,
        ),
      this.db
        .prepare(`INSERT INTO template_revisions (template_id, version, body, fields_json)
                  VALUES (?, ?, ?, ?)`)
        .bind(template.id, template.version, template.body, JSON.stringify(template.fields)),
    ]);
    const created = await this.find(workspaceId, template.id);
    if (!created) throw new Error("Created template could not be loaded");
    return created;
  }

  async update(workspaceId: string, id: string, input: TemplateInput): Promise<Template | null> {
    const existing = await this.find(workspaceId, id);
    if (!existing) return null;
    const updated = { ...existing, ...input, version: existing.version + 1 };
    const result = await this.db
      .prepare(`UPDATE templates
                SET title = ?, description = ?, category = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND workspace_id = ?`)
      .bind(updated.title, updated.description, updated.category, updated.version, id, workspaceId)
      .run();
    if (!result.meta.changes) return null;
    await this.db
      .prepare(
        `INSERT INTO template_revisions (template_id, version, body, fields_json) VALUES (?, ?, ?, ?)`,
      )
      .bind(id, updated.version, updated.body, JSON.stringify(updated.fields))
      .run();
    return this.find(workspaceId, id);
  }
}
