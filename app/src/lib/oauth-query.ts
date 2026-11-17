/** The signed authorization query (without the leading `?`), or null when the URL has none. */
export function oauthQuery(searchStr: string): string | null {
  const query = new URLSearchParams(searchStr);

  return query.has("sig") ? searchStr.replace(/^\?/, "") : null;
}

/** Scope descriptions shown on the consent screen. Unknown scopes are shown by name only. */
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "prompt-shelf.search": "Find your prompt templates",
  "prompt-shelf.execute":
    "Read templates, fill in prompts, and propose edits. You approve every edit in Prompt Shelf.",
  offline_access: "Stay connected for up to a week without signing in again",
};
