export type CompiledPrompt = {
  text: string;
  segments: Array<{ type: "static" | "value"; text: string; key?: string }>;
};

export function compilePrompt(body: string, values: Record<string, string>): CompiledPrompt {
  const segments: CompiledPrompt["segments"] = [];
  let last = 0;
  const token = /{{\s*([\w-]+)\s*}}/g;
  let match: RegExpExecArray | null;

  while ((match = token.exec(body))) {
    if (match.index > last) segments.push({ type: "static", text: body.slice(last, match.index) });
    segments.push({ type: "value", key: match[1], text: values[match[1]] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < body.length) segments.push({ type: "static", text: body.slice(last) });

  return { text: segments.map((segment) => segment.text).join(""), segments };
}
