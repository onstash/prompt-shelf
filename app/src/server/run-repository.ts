import type { Field } from "./template-repository";

export type SavedRunSummary = {
  id: string;
  templateId: string;
  templateVersion: number;
  templateTitle: string;
  createdAt: string;
};

export type SavedRun = SavedRunSummary & {
  body: string;
  fields: Field[];
  values: Record<string, string>;
};

export type SavedRunPage = {
  runs: SavedRunSummary[];
  nextCursor: string | null;
};

const pageSize = 25;

type RunRow = {
  id: string;
  template_id: string;
  template_version: number;
  template_title: string;
  body: string;
  fields_json: string;
  values_json: string;
  created_at: string;
};

const selectRun = `
  SELECT sr.id, sr.template_id, sr.template_version, sr.created_at, sr.values_json,
         t.title AS template_title, tr.body, tr.fields_json
  FROM saved_runs sr
  JOIN templates t ON t.id = sr.template_id
  JOIN template_revisions tr
    ON tr.template_id = sr.template_id AND tr.version = sr.template_version
`;

function mapRun(row: RunRow): SavedRun {
  return {
    id: row.id,
    templateId: row.template_id,
    templateVersion: row.template_version,
    templateTitle: row.template_title,
    createdAt: row.created_at,
    body: row.body,
    // SAFETY: fields_json is written only by the template repository.
    fields: JSON.parse(row.fields_json) as Field[],
    // SAFETY: values_json is validated by the API and written only by this repository.
    values: JSON.parse(row.values_json) as Record<string, string>,
  };
}

export class D1RunRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async create(
    workspaceId: string,
    templateId: string,
    templateVersion: number,
    values: Record<string, string>,
  ): Promise<SavedRun | null> {
    const revision = await this.db
      .prepare(
        `SELECT 1
         FROM templates t
         JOIN template_revisions tr ON tr.template_id = t.id
         WHERE t.id = ? AND tr.version = ? AND t.workspace_id = ?`,
      )
      .bind(templateId, templateVersion, workspaceId)
      .first();
    if (!revision) return null;

    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO saved_runs (id, workspace_id, template_id, template_version, values_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, workspaceId, templateId, templateVersion, JSON.stringify(values))
      .run();
    return this.find(workspaceId, id);
  }

  async list(workspaceId: string, cursor?: string): Promise<SavedRunPage> {
    const separator = cursor?.lastIndexOf("|") ?? -1;
    const cursorCreatedAt = separator > 0 ? cursor?.slice(0, separator) : undefined;
    const cursorId = separator > 0 ? cursor?.slice(separator + 1) : undefined;
    if (cursor && (!cursorCreatedAt || !cursorId)) return { runs: [], nextCursor: null };

    const result = await this.db
      .prepare(
        `${selectRun} WHERE sr.workspace_id = ?
         AND (? IS NULL OR sr.created_at < ? OR (sr.created_at = ? AND sr.id < ?))
         ORDER BY sr.created_at DESC, sr.id DESC LIMIT ?`,
      )
      .bind(
        workspaceId,
        cursorCreatedAt ?? null,
        cursorCreatedAt ?? null,
        cursorCreatedAt ?? null,
        cursorId ?? null,
        pageSize + 1,
      )
      .all<RunRow>();
    const page = result.results.slice(0, pageSize);
    return {
      runs: page.map(({ id, template_id, template_version, template_title, created_at }) => ({
        id,
        templateId: template_id,
        templateVersion: template_version,
        templateTitle: template_title,
        createdAt: created_at,
      })),
      nextCursor:
        result.results.length > pageSize && page.length
          ? `${page.at(-1)?.created_at}|${page.at(-1)?.id}`
          : null,
    };
  }

  async find(workspaceId: string, id: string): Promise<SavedRun | null> {
    const row = await this.db
      .prepare(`${selectRun} WHERE sr.workspace_id = ? AND sr.id = ?`)
      .bind(workspaceId, id)
      .first<RunRow>();
    return row ? mapRun(row) : null;
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM saved_runs WHERE id = ? AND workspace_id = ?")
      .bind(id, workspaceId)
      .run();
    return Boolean(result.meta.changes);
  }
}
