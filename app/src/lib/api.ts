const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

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
  updatedAt: string;
  isExample: boolean;
};
export type TemplateRevision = {
  version: number;
  body: string;
  fields: TemplateField[];
  createdAt: string;
};
export type CompileResult = {
  text: string;
  segments: Array<{ type: "static" | "value"; text: string; key?: string }>;
};
export type ProductEventName =
  | "template_opened"
  | "form_started"
  | "prompt_copied"
  | "template_created";

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
    credentials: "include",
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
  trackProductEvent: (name: ProductEventName, templateId: string) =>
    request<{ accepted: true }>("/api/product-events", {
      method: "POST",
      body: JSON.stringify({ name, templateId }),
      keepalive: true,
    }),
  getExample: (id: string) => request<Template>(`/api/examples/${id}`),
  compileExample: (id: string, values: Record<string, string>) =>
    request<CompileResult>(`/api/examples/${id}/compile`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  listTemplates: () => request<Template[]>("/api/templates"),
  getTemplate: (id: string) => request<Template>(`/api/templates/${id}`),
  compileTemplate: (id: string, values: Record<string, string>) =>
    request<CompileResult>(`/api/templates/${id}/compile`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  listTemplateRevisions: (id: string) =>
    request<TemplateRevision[]>(`/api/templates/${id}/revisions`),
  restoreTemplateRevision: (id: string, version: number) =>
    request<Template>(`/api/templates/${id}/revisions/${version}/restore`, { method: "POST" }),
  deleteTemplate: (id: string) =>
    request<{ deleted: true }>(`/api/templates/${id}`, { method: "DELETE" }),
  updateTemplate: (
    id: string,
    input: Pick<Template, "title" | "description" | "body" | "fields">,
  ) =>
    request<Template>(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  createTemplate: (input: Pick<Template, "title" | "description" | "body" | "fields">) =>
    request<Template>("/api/templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
