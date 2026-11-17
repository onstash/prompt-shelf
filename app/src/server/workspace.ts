/** The personal workspace ID for a user. Each user gets one personal workspace. */
export function personalWorkspaceId(userId: string): string {
  return `personal-${userId}`;
}
