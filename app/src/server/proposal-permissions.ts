/** Only owners and admins may approve or reject proposals. Members may propose but not decide. */
export function canDecideProposals(role: string): boolean {
  return role === "owner" || role === "admin";
}

/** Proposals one client may create per hour. Limits spam into the approval inbox. */
export const PROPOSALS_PER_CLIENT_PER_HOUR = 20;

export function withinProposalLimit(recentCount: number): boolean {
  return recentCount < PROPOSALS_PER_CLIENT_PER_HOUR;
}
