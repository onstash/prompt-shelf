export type DraftSection = {
  id: string;
  heading: string;
  level: number;
  body: string;
};

const headingPattern = /^(#{1,6})[ \t]+(.+?)\s*$/gm;

export function parseMarkdownSections(markdown: string): DraftSection[] {
  const matches = [...markdown.matchAll(headingPattern)];
  if (matches.length === 0) {
    return [{ id: "main", heading: "Main prompt", level: 1, body: markdown }];
  }

  const headings = new Set<string>();

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    const baseHeading = match[2].trim() || "Untitled section";
    let heading = baseHeading;
    let suffix = 2;
    while (headings.has(heading)) {
      heading = `${baseHeading} ${suffix}`;
      suffix += 1;
    }
    headings.add(heading);

    return {
      id: `section-${index}`,
      heading,
      level: match[1].length,
      body: markdown.slice(start, end).replace(/^\n+|\n+$/g, ""),
    };
  });
}

export function renumberSectionsAfterDeletion(
  sections: DraftSection[],
  deletedHeading: string,
): DraftSection[] {
  const baseHeading = deletedHeading.replace(/ \d+$/, "");
  return sections.map((section) => {
    if (!section.heading.startsWith(`${baseHeading} `)) return section;
    const suffix = Number(section.heading.slice(baseHeading.length + 1));
    if (!Number.isInteger(suffix) || suffix <= 1) return section;
    return {
      ...section,
      heading: suffix === 2 ? baseHeading : `${baseHeading} ${suffix - 1}`,
    };
  });
}

export function serializeMarkdownSections(sections: DraftSection[]): string {
  return sections
    .map(
      (section) =>
        `#${"#".repeat(Math.max(0, section.level - 1))} ${section.heading.trim()}\n\n${section.body.trim()}`,
    )
    .join("\n\n")
    .trim();
}
