const siteName = "Prompt Shelf";
const siteOrigin = "https://prompt-shelf-api.hastons.workers.dev";

type PublicPageMetadata = {
  title: string;
  description: string;
  path: string;
};

export function publicPageHead({ title, description, path }: PublicPageMetadata) {
  const url = new URL(path, siteOrigin).toString();

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function privatePageHead(title: string) {
  return {
    meta: [{ title }, { name: "robots", content: "noindex, nofollow" }],
  };
}
