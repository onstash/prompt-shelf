/** Only owners and admins may approve or reject proposals. Members may propose but not decide. */
export function canDecideProposals(role: string): boolean {
  return role === "owner" || role === "admin";
}
