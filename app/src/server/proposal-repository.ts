import type { Db } from "./db.ts";
import type { Field, TemplateInput } from "./template-repository.ts";

export type ProposalStatus = "pending" | "approved" | "rejected" | "conflict";

export type Proposal = TemplateInput & {
  id: string;
  templateId: string;
  baseVersion: number;
  status: ProposalStatus;
  createdAt: string;
  decidedAt: string | null;
  appliedVersion: number | null;
};

export type ProposalCreateResult =
  | { status: "created"; proposal: Proposal }
  | { status: "not_found" }
  | { status: "read_only" };

export type ProposalDecisionResult =
  | { status: "approved"; version: number }
  | { status: "rejected" }
  | { status: "conflict"; currentVersion: number }
  | { status: "not_found" }
  | { status: "not_pending" };

type ProposalRow = {
  id: string;
  template_id: string;
  base_version: number;
  title: string;
  description: string;
  category: string;
  body: string;
  fields_json: string;
  status: ProposalStatus;
  created_at: string;
  decided_at: string | null;
  applied_version: number | null;
};

function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    templateId: row.template_id,
    baseVersion: row.base_version,
    title: row.title,
    description: row.description,
    category: row.category,
    body: row.body,
    // SAFETY: fields_json is written only from validated field arrays.
    fields: JSON.parse(row.fields_json) as Field[],
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    appliedVersion: row.applied_version,
  };
}

const selectProposal = `
  SELECT id, template_id, base_version, title, description, category, body, fields_json,
         status, created_at, decided_at, applied_version
  FROM template_update_proposals
`;

/** Stores and decides prompt update proposals. Every query is scoped to the workspace. */
export class D1ProposalRepository {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async create(
    workspaceId: string,
    templateId: string,
    baseVersion: number,
    content: TemplateInput,
    clientId: string | null,
  ): Promise<ProposalCreateResult> {
    const template = await this.db
      .query("SELECT workspace_id FROM templates WHERE id = ?")
      .bind(templateId)
      .first<{ workspace_id: string | null }>();
    if (!template) return { status: "not_found" };
    if (template.workspace_id !== workspaceId) {
      return template.workspace_id === null ? { status: "read_only" } : { status: "not_found" };
    }

    const id = crypto.randomUUID();
    await this.db
      .query(
        `INSERT INTO template_update_proposals
           (id, workspace_id, template_id, base_version, title, description, category, body,
            fields_json, status, created_by_client_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        id,
        workspaceId,
        templateId,
        baseVersion,
        content.title,
        content.description,
        content.category,
        content.body,
        JSON.stringify(content.fields),
        clientId,
      )
      .run();
    const proposal = await this.find(workspaceId, id);
    if (!proposal) throw new Error("Created proposal could not be loaded");
    return { status: "created", proposal };
  }

  /** Proposals this client created in the workspace since `since`. Used for the propose rate limit. */
  async countSince(workspaceId: string, clientId: string | null, since: string): Promise<number> {
    const row = await this.db
      .query(
        `SELECT COUNT(*) AS total FROM template_update_proposals
         WHERE workspace_id = ? AND created_by_client_id IS ? AND created_at >= ?`,
      )
      .bind(workspaceId, clientId, since)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  async list(workspaceId: string, status: ProposalStatus): Promise<Proposal[]> {
    const result = await this.db
      .query(`${selectProposal} WHERE workspace_id = ? AND status = ? ORDER BY created_at DESC`)
      .bind(workspaceId, status)
      .all<ProposalRow>();
    return result.results.map(mapProposal);
  }

  async find(workspaceId: string, id: string): Promise<Proposal | null> {
    const row = await this.db
      .query(`${selectProposal} WHERE workspace_id = ? AND id = ?`)
      .bind(workspaceId, id)
      .first<ProposalRow>();
    return row ? mapProposal(row) : null;
  }

  async reject(workspaceId: string, id: string, userId: string): Promise<ProposalDecisionResult> {
    const existing = await this.find(workspaceId, id);
    if (!existing) return { status: "not_found" };
    const result = await this.db
      .query(
        `UPDATE template_update_proposals
         SET status = 'rejected', decided_by_user_id = ?, decided_at = CURRENT_TIMESTAMP
         WHERE id = ? AND workspace_id = ? AND status = 'pending'`,
      )
      .bind(userId, id, workspaceId)
      .run();
    return result.meta.changes ? { status: "rejected" } : { status: "not_pending" };
  }

  /**
   * Applies a pending proposal as the next revision.
   *
   * One D1 batch runs three guarded statements, in order: decide the proposal, insert the revision,
   * and update the template. Each step checks that the template is still at the proposal's base
   * version. If it moved on, the proposal becomes `conflict` and nothing else changes.
   */
  async approve(workspaceId: string, id: string, userId: string): Promise<ProposalDecisionResult> {
    const proposal = await this.find(workspaceId, id);
    if (!proposal) return { status: "not_found" };
    if (proposal.status !== "pending") return { status: "not_pending" };

    const nextVersion = proposal.baseVersion + 1;
    await this.db.transaction([
      this.db
        .query(
          `UPDATE template_update_proposals
           SET status = CASE WHEN (SELECT t.current_version FROM templates t
                                   WHERE t.id = template_update_proposals.template_id
                                     AND t.workspace_id = template_update_proposals.workspace_id) = template_update_proposals.base_version
                             THEN 'approved' ELSE 'conflict' END,
               applied_version = CASE WHEN (SELECT t.current_version FROM templates t
                                            WHERE t.id = template_update_proposals.template_id
                                              AND t.workspace_id = template_update_proposals.workspace_id) = template_update_proposals.base_version
                                      THEN base_version + 1 ELSE NULL END,
               decided_by_user_id = ?,
               decided_at = CURRENT_TIMESTAMP
           WHERE id = ? AND workspace_id = ? AND status = 'pending'`,
        )
        .bind(userId, id, workspaceId),
      this.db
        .query(
          `INSERT INTO template_revisions (template_id, version, body, fields_json)
           SELECT t.id, ?, ?, ? FROM templates t
           WHERE t.id = ? AND t.workspace_id = ? AND t.current_version = ?
             AND EXISTS (SELECT 1 FROM template_update_proposals p
                         WHERE p.id = ? AND p.status = 'approved')`,
        )
        .bind(
          nextVersion,
          proposal.body,
          JSON.stringify(proposal.fields),
          proposal.templateId,
          workspaceId,
          proposal.baseVersion,
          id,
        ),
      this.db
        .query(
          `UPDATE templates
           SET title = ?, description = ?, category = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND workspace_id = ? AND current_version = ?
             AND EXISTS (SELECT 1 FROM template_update_proposals p
                         WHERE p.id = ? AND p.status = 'approved')`,
        )
        .bind(
          proposal.title,
          proposal.description,
          proposal.category,
          nextVersion,
          proposal.templateId,
          workspaceId,
          proposal.baseVersion,
          id,
        ),
    ]);

    const decided = await this.find(workspaceId, id);
    if (!decided) return { status: "not_found" };
    if (decided.status === "approved") return { status: "approved", version: nextVersion };
    if (decided.status === "conflict") {
      const current = await this.db
        .query("SELECT current_version FROM templates WHERE id = ? AND workspace_id = ?")
        .bind(proposal.templateId, workspaceId)
        .first<{ current_version: number }>();
      return {
        status: "conflict",
        currentVersion: current?.current_version ?? proposal.baseVersion,
      };
    }
    return { status: "not_pending" };
  }
}
