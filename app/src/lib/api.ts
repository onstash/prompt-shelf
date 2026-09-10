const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type FieldType = "text" | "textarea" | "select" | "number";
export type TemplateField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};
export type Template = {
  id: string;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: TemplateField[];
  version: number;
};
export type CompileResult = {
  text: string;
  segments: Array<{ type: "static" | "value"; text: string; key?: string }>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, string | string[] | undefined>;

  constructor(
    message: string,
    status: number,
    details?: Record<string, string | string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = undefined;
    }
    // SAFETY: API errors use a JSON object with optional string or string-array details.
    throw new ApiError(
      `Request failed (${response.status})`,
      response.status,
      details as Record<string, string | string[] | undefined> | undefined,
    );
  }
  // SAFETY: each API method supplies the response contract for this request.
  return response.json() as Promise<T>;
}

export const api = {
  getTemplate: (id: string) => request<Template>(`/api/templates/${id}`),
  compileTemplate: (id: string, values: Record<string, string>) =>
    request<CompileResult>(`/api/templates/${id}/compile`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  createTemplate: (input: Pick<Template, "title" | "description" | "body" | "fields">) =>
    request<Template>("/api/templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
