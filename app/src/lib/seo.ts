const siteName = "Prompt Shelf";
const siteOrigin = "https://prompt-shelf-api.hastons.workers.dev";
const socialImageUrl = `${siteOrigin}/og/prompt-shelf-og.png`;
const socialImageAlt =
  "Prompt Shelf interface showing a template with typed variables and its compiled prompt.";

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  url: `${siteOrigin}/`,
  description:
    "Prompt Shelf helps people create reusable AI prompt templates with typed variables, preview compiled prompts, and copy them into AI tools.",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser",
  isAccessibleForFree: true,
  image: socialImageUrl,
  featureList: [
    "Reusable AI prompt templates",
    "Typed prompt variables",
    "Structured prompt forms",
    "Compiled prompt preview",
    "Copy prompts for use in external AI tools",
    "Private-by-default prompt organization",
  ],
};

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
      { property: "og:image", content: socialImageUrl },
      { property: "og:image:secure_url", content: socialImageUrl },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: socialImageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImageUrl },
      { name: "twitter:image:alt", content: socialImageAlt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function privatePageHead(title: string) {
  return {
    meta: [{ title }, { name: "robots", content: "noindex, nofollow" }],
  };
}
