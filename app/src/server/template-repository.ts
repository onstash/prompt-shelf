import type { Db } from "./db.ts";
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
  isExample: boolean;
};

export type TemplateRevision = {
  version: number;
  body: string;
  fields: Field[];
  createdAt: string;
};

export type TemplateInput = Pick<
  Template,
  "title" | "description" | "category" | "body" | "fields"
>;

export type TemplateUpdateResult =
  | { status: "updated"; template: Template }
  | { status: "not_found" }
  | { status: "read_only" }
  | { status: "conflict"; currentVersion: number };

export interface TemplateRepository {
  list(workspaceId: string): Promise<Template[]>;
  find(workspaceId: string, id: string): Promise<Template | null>;
  findSystemExample(id: string): Promise<Template | null>;
  create(workspaceId: string, template: Template): Promise<Template>;
  update(
    workspaceId: string,
    id: string,
    input: TemplateInput,
    baseVersion?: number,
  ): Promise<TemplateUpdateResult>;
  delete(workspaceId: string, id: string): Promise<boolean>;
  listRevisions(workspaceId: string, id: string): Promise<TemplateRevision[]>;
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
  workspace_id: string | null;
};

const selectCurrentRevision = `
  SELECT t.id, t.title, t.description, t.category, t.workspace_id,
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
    isExample: row.workspace_id === null,
  };
}

export class D1TemplateRepository implements TemplateRepository {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async list(workspaceId: string): Promise<Template[]> {
    const result = await this.db
      .query(
        `${selectCurrentRevision} WHERE t.workspace_id = ? OR t.workspace_id IS NULL ORDER BY t.updated_at DESC`,
      )
      .bind(workspaceId)
      .all<TemplateRow>();
    return result.results.map(mapTemplate);
  }

  async findSystemExample(id: string): Promise<Template | null> {
    const row = await this.db
      .query(`${selectCurrentRevision} WHERE t.id = ? AND t.workspace_id IS NULL`)
      .bind(id)
      .first<TemplateRow>();
    return row ? mapTemplate(row) : null;
  }

  async find(workspaceId: string, id: string): Promise<Template | null> {
    const row = await this.db
      .query(
        `${selectCurrentRevision} WHERE t.id = ? AND (t.workspace_id = ? OR t.workspace_id IS NULL)`,
      )
      .bind(id, workspaceId)
      .first<TemplateRow>();
    return row ? mapTemplate(row) : null;
  }

  async create(workspaceId: string, template: Template): Promise<Template> {
    await this.db.transaction([
      this.db
        .query(`INSERT INTO templates (id, title, description, category, current_version, workspace_id)
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
        .query(`INSERT INTO template_revisions (template_id, version, body, fields_json)
                  VALUES (?, ?, ?, ?)`)
        .bind(template.id, template.version, template.body, JSON.stringify(template.fields)),
    ]);
    const created = await this.find(workspaceId, template.id);
    if (!created) throw new Error("Created template could not be loaded");
    return created;
  }

  async listRevisions(workspaceId: string, id: string): Promise<TemplateRevision[]> {
    if (!(await this.find(workspaceId, id))) return [];
    const result = await this.db
      .query(
        `SELECT r.version, r.body, r.fields_json, r.created_at
         FROM template_revisions r
         JOIN templates t ON t.id = r.template_id
         WHERE r.template_id = ? AND (t.workspace_id = ? OR t.workspace_id IS NULL)
         ORDER BY r.version DESC`,
      )
      .bind(id, workspaceId)
      .all<{ version: number; body: string; fields_json: string; created_at: string }>();
    // SAFETY: fields_json is written only from validated template field arrays.
    return result.results.map((row) => ({
      version: row.version,
      body: row.body,
      fields: JSON.parse(row.fields_json) as Field[],
      createdAt: row.created_at,
    }));
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const result = await this.db
      .query("DELETE FROM templates WHERE id = ? AND workspace_id = ?")
      .bind(id, workspaceId)
      .run();
    return Boolean(result.meta.changes);
  }

  /**
   * Saves a new revision only if the template is still at `baseVersion`.
   *
   * Both statements run in one D1 batch (a single transaction). Each one repeats the
   * same version guard, so a stale or concurrent save writes nothing. If the guard
   * fails, the caller gets a conflict instead of a partial or overwritten update.
   */
  async update(
    workspaceId: string,
    id: string,
    input: TemplateInput,
    baseVersion?: number,
  ): Promise<TemplateUpdateResult> {
    const existing = await this.find(workspaceId, id);
    if (!existing) return { status: "not_found" };
    if (existing.isExample) return { status: "read_only" };

    const expectedVersion = baseVersion ?? existing.version;
    const nextVersion = expectedVersion + 1;
    const [, templateUpdate] = await this.db.transaction([
      this.db
        .query(
          `INSERT INTO template_revisions (template_id, version, body, fields_json)
           SELECT t.id, ?, ?, ? FROM templates t
           WHERE t.id = ? AND t.workspace_id = ? AND t.current_version = ?`,
        )
        .bind(
          nextVersion,
          input.body,
          JSON.stringify(input.fields),
          id,
          workspaceId,
          expectedVersion,
        ),
      this.db
        .query(
          `UPDATE templates
           SET title = ?, description = ?, category = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND workspace_id = ? AND current_version = ?`,
        )
        .bind(
          input.title,
          input.description,
          input.category,
          nextVersion,
          id,
          workspaceId,
          expectedVersion,
        ),
    ]);

    if (!templateUpdate?.meta.changes) {
      const current = await this.find(workspaceId, id);
      if (!current) return { status: "not_found" };
      return { status: "conflict", currentVersion: current.version };
    }

    const updated = await this.find(workspaceId, id);
    if (!updated) throw new Error("Updated template could not be loaded");
    return { status: "updated", template: updated };
  }
}
