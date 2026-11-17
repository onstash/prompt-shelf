import type { Db } from "./db.ts";
import type { Field, TemplateInput } from "./template-repository.ts";

export type ProposalStatus = "pending" | "approved" | "rejected" | "conflict";
export type ProposalKind = "update" | "create";

export type Proposal = TemplateInput & {
  id: string;
  kind: ProposalKind;
  /** The template an update changes. Null for a creation. */
  templateId: string | null;
  /** The version an update was based on. Null for a creation. */
  baseVersion: number | null;
  status: ProposalStatus;
  createdAt: string;
  decidedAt: string | null;
  appliedVersion: number | null;
  /** The template a creation produced, set when it is approved. */
  appliedTemplateId: string | null;
};

export type ProposalCreateResult =
  | { status: "created"; proposal: Proposal }
  | { status: "not_found" }
  | { status: "read_only" };

export type ProposalDecisionResult =
  | { status: "approved"; version: number; templateId: string }
  | { status: "rejected" }
  | { status: "conflict"; currentVersion: number }
  | { status: "not_found" }
  | { status: "not_pending" };

type ProposalRow = {
  id: string;
  kind: ProposalKind;
  template_id: string | null;
  base_version: number | null;
  title: string;
  description: string;
  category: string;
  body: string;
  fields_json: string;
  status: ProposalStatus;
  created_at: string;
  decided_at: string | null;
  applied_version: number | null;
  applied_template_id: string | null;
};

function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    kind: row.kind,
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
    appliedTemplateId: row.applied_template_id,
  };
}

const selectProposal = `
  SELECT id, kind, template_id, base_version, title, description, category, body, fields_json,
         status, created_at, decided_at, applied_version, applied_template_id
  FROM template_update_proposals
`;

/** Stores and decides prompt proposals: updates to a template, or creation of a new one. */
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
    return this.insert({
      workspaceId,
      kind: "update",
      templateId,
      baseVersion,
      content,
      clientId,
    });
  }

  /** A proposal to create a new template. The template ID is generated when the proposal is approved. */
  async createNew(
    workspaceId: string,
    content: TemplateInput,
    clientId: string | null,
  ): Promise<ProposalCreateResult> {
    return this.insert({
      workspaceId,
      kind: "create",
      templateId: null,
      baseVersion: null,
      content,
      clientId,
    });
  }

  private async insert(input: {
    workspaceId: string;
    kind: ProposalKind;
    templateId: string | null;
    baseVersion: number | null;
    content: TemplateInput;
    clientId: string | null;
  }): Promise<ProposalCreateResult> {
    const id = crypto.randomUUID();
    await this.db
      .query(
        `INSERT INTO template_update_proposals
           (id, kind, workspace_id, template_id, base_version, title, description, category, body,
            fields_json, status, created_by_client_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        id,
        input.kind,
        input.workspaceId,
        input.templateId,
        input.baseVersion,
        input.content.title,
        input.content.description,
        input.content.category,
        input.content.body,
        JSON.stringify(input.content.fields),
        input.clientId,
      )
      .run();
    const proposal = await this.find(input.workspaceId, id);
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

  /** Proposals in the workspace, newest first. Pass null to list every status. */
  async list(workspaceId: string, status: ProposalStatus | null): Promise<Proposal[]> {
    const result = status
      ? await this.db
          .query(`${selectProposal} WHERE workspace_id = ? AND status = ? ORDER BY created_at DESC`)
          .bind(workspaceId, status)
          .all<ProposalRow>()
      : await this.db
          .query(`${selectProposal} WHERE workspace_id = ? ORDER BY created_at DESC`)
          .bind(workspaceId)
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

  async approve(workspaceId: string, id: string, userId: string): Promise<ProposalDecisionResult> {
    const proposal = await this.find(workspaceId, id);
    if (!proposal) return { status: "not_found" };
    if (proposal.status !== "pending") return { status: "not_pending" };
    return proposal.kind === "create"
      ? this.approveCreation(workspaceId, proposal, userId)
      : this.approveUpdate(workspaceId, proposal, userId);
  }

  /**
   * Creates the template. The new ID is set on the proposal in the same batch, and every later
   * statement is guarded on that ID, so a repeated approval cannot create a second template.
   */
  private async approveCreation(
    workspaceId: string,
    proposal: Proposal,
    userId: string,
  ): Promise<ProposalDecisionResult> {
    const templateId = crypto.randomUUID();
    await this.db.transaction([
      this.db
        .query(
          `UPDATE template_update_proposals
           SET status = 'approved', applied_template_id = ?, decided_by_user_id = ?, decided_at = CURRENT_TIMESTAMP
           WHERE id = ? AND workspace_id = ? AND kind = 'create' AND status = 'pending'`,
        )
        .bind(templateId, userId, proposal.id, workspaceId),
      this.db
        .query(
          `INSERT INTO templates (id, title, description, category, current_version, workspace_id)
           SELECT ?, p.title, p.description, p.category, 1, p.workspace_id
           FROM template_update_proposals p
           WHERE p.id = ? AND p.workspace_id = ? AND p.applied_template_id = ?`,
        )
        .bind(templateId, proposal.id, workspaceId, templateId),
      this.db
        .query(
          `INSERT INTO template_revisions (template_id, version, body, fields_json)
           SELECT ?, 1, p.body, p.fields_json
           FROM template_update_proposals p
           WHERE p.id = ? AND p.workspace_id = ? AND p.applied_template_id = ?`,
        )
        .bind(templateId, proposal.id, workspaceId, templateId),
    ]);

    const decided = await this.find(workspaceId, proposal.id);
    if (decided?.appliedTemplateId === templateId) {
      return { status: "approved", version: 1, templateId };
    }
    return { status: "not_pending" };
  }

  /**
   * Applies a pending update as the next revision.
   *
   * One D1 batch runs three guarded statements, in order: decide the proposal, insert the revision,
   * and update the template. Each step checks that the template is still at the proposal's base
   * version. If it moved on, the proposal becomes `conflict` and nothing else changes.
   */
  private async approveUpdate(
    workspaceId: string,
    proposal: Proposal,
    userId: string,
  ): Promise<ProposalDecisionResult> {
    const id = proposal.id;
    const templateId = proposal.templateId ?? "";
    const baseVersion = proposal.baseVersion ?? 0;
    const nextVersion = baseVersion + 1;
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
           WHERE id = ? AND workspace_id = ? AND kind = 'update' AND status = 'pending'`,
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
          templateId,
          workspaceId,
          baseVersion,
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
          templateId,
          workspaceId,
          baseVersion,
          id,
        ),
    ]);

    const decided = await this.find(workspaceId, id);
    if (!decided) return { status: "not_found" };
    if (decided.status === "approved") {
      return { status: "approved", version: nextVersion, templateId };
    }
    if (decided.status === "conflict") {
      const current = await this.db
        .query("SELECT current_version FROM templates WHERE id = ? AND workspace_id = ?")
        .bind(templateId, workspaceId)
        .first<{ current_version: number }>();
      return { status: "conflict", currentVersion: current?.current_version ?? baseVersion };
    }
    return { status: "not_pending" };
  }
}
