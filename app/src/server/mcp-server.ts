import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  OPERATION_NAMES,
  SEARCH_SCOPE,
  executeOperation,
  operationCatalog,
  operationRequest,
  type Principal,
} from "./mcp-operations.ts";

const tools = [
  {
    name: "search",
    description: "List the operations Prompt Shelf supports, with their input schemas.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "execute",
    description: "Run one operation from search. Proposed edits wait for approval in Prompt Shelf.",
    inputSchema: {
      type: "object" as const,
      properties: {
        operation: { type: "string", enum: [...OPERATION_NAMES] },
        arguments: { type: "object" },
      },
      required: ["operation"],
    },
  },
];

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

/** Serves one stateless MCP request for an already verified principal. */
export async function handleMcpRequest(request: Request, principal: Principal): Promise<Response> {
  const server = new Server(
    { name: "prompt-shelf", version: "0.4.3" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (input) => {
    if (input.params.name === "search") {
      if (!principal.scopes.has(SEARCH_SCOPE)) {
        return textResult(`Missing scope ${SEARCH_SCOPE}`, true);
      }
      return textResult(JSON.stringify(operationCatalog()));
    }
    if (input.params.name === "execute") {
      const parsed = operationRequest.safeParse(input.params.arguments);
      if (!parsed.success) return textResult("Invalid execute arguments", true);
      const result = await executeOperation(principal, parsed.data);
      return result.ok ? textResult(JSON.stringify(result.data)) : textResult(result.error, true);
    }
    return textResult(`Unknown tool: ${input.params.name}`, true);
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const headers = new Headers(request.headers);
  headers.set("accept", "application/json, text/event-stream");
  return transport.handleRequest(new Request(request, { headers }));
}
