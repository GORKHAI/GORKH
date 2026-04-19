---
name: ai-agent-systems
description: >
  GORKH AI agent orchestration, LLM provider integration, tool calling, prompt/runtime
  design, local model serving (Qwen via Ollama), structured output reliability, fallback
  logic, chat-to-task flow, action planning, and agent evaluation/debugging. Use this skill
  for ANY work involving LLM calls, agent logic, tool execution pipelines, prompt engineering,
  model provider switching, response parsing, action planning, approval flows tied to AI
  actions, or agent failure handling. Trigger for "LLM", "agent", "AI", "model", "Qwen",
  "Ollama", "OpenAI", "Claude", "tool calling", "function calling", "prompt", "chat",
  "task", "action plan", "structured output", "fallback", "provider", "completion",
  "streaming", "local model", or "Free AI".
---

# AI Agent Systems — GORKH

The product wins or loses on: "user asks, app actually does it." This skill covers the
full agent stack from natural-language input to executed action.

## Provider Architecture

GORKH supports multiple LLM providers. Keys stay in the local OS keychain (see desktop-tauri skill).

```
┌──────────────────────────────────────────────────────────┐
│                     Agent Orchestrator                    │
│  (receives user message, plans actions, manages state)   │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                    Provider Router                        │
│  Selects provider based on user config + availability    │
├──────────┬──────────┬──────────────┬─────────────────────┤
│ Free AI  │ OpenAI   │ Claude       │ Custom OAI-compat   │
│ (local)  │ (cloud)  │ (cloud)      │ (user endpoint)     │
│ Ollama   │ gpt-4o   │ claude-4     │ any base URL        │
│ Qwen     │ etc.     │ sonnet etc.  │                     │
└──────────┴──────────┴──────────────┴─────────────────────┘
```

### Provider Configuration Types

```typescript
// packages/shared/src/providers.ts
export type ProviderType = "free_ai" | "openai" | "claude" | "custom_openai";

export interface ProviderConfig {
  type: ProviderType;
  enabled: boolean;
  model?: string;           // specific model override
  baseUrl?: string;         // custom endpoint (custom_openai only)
  maxTokens?: number;
  temperature?: number;
}

export interface ProviderStatus {
  type: ProviderType;
  available: boolean;
  hasApiKey: boolean;        // from keychain check
  runtimeRunning?: boolean;  // for free_ai only
  modelLoaded?: boolean;     // for free_ai only
  error?: string;
}

// Default provider configs
export const DEFAULT_PROVIDERS: Record<ProviderType, ProviderConfig> = {
  free_ai: {
    type: "free_ai",
    enabled: true,
    model: "qwen2.5:7b",
    baseUrl: "http://localhost:11434",
  },
  openai: {
    type: "openai",
    enabled: false,
    model: "gpt-4o",
  },
  claude: {
    type: "claude",
    enabled: false,
    model: "claude-sonnet-4-20250514",
  },
  custom_openai: {
    type: "custom_openai",
    enabled: false,
  },
};
```

## Provider Client Implementation

### Unified Provider Interface

```typescript
// packages/shared/src/llm-client.ts
export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface CompletionRequest {
  messages: LLMMessage[];
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | "required";
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string | null;
  tool_calls: ToolCall[];
  finish_reason: "stop" | "tool_calls" | "length" | "error";
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface StreamChunk {
  type: "content" | "tool_call_start" | "tool_call_delta" | "done" | "error";
  content?: string;
  tool_call?: Partial<ToolCall>;
  error?: string;
}

export interface LLMProvider {
  readonly type: ProviderType;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
  isAvailable(): Promise<boolean>;
}
```

### OpenAI-Compatible Client (covers OpenAI, Ollama, Custom)

```typescript
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    public readonly type: ProviderType,
    private baseUrl: string,
    private apiKey: string | null,
    private model: string,
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body = {
      model: this.model,
      messages: request.messages,
      tools: request.tools,
      tool_choice: request.tool_choice,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      stream: false,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ProviderError(this.type, res.status, err);
    }

    const data = await res.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls ?? [],
      finish_reason: choice.finish_reason === "tool_calls" ? "tool_calls" : "stop",
      usage: data.usage,
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const body = {
      model: this.model,
      messages: request.messages,
      tools: request.tools,
      tool_choice: request.tool_choice,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      stream: true,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      yield { type: "error", error: `Provider returned ${res.status}` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          yield { type: "done" };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: "content", content: delta.content };
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) {
                yield { type: "tool_call_start", tool_call: tc };
              } else if (tc.function?.arguments) {
                yield { type: "tool_call_delta", tool_call: tc };
              }
            }
          }
        } catch {
          // skip unparseable SSE lines
        }
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
```

### Claude Provider

```typescript
export class ClaudeProvider implements LLMProvider {
  readonly type = "claude" as const;

  constructor(
    private apiKey: string,
    private model: string = "claude-sonnet-4-20250514",
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Anthropic API uses a different format
    const messages = request.messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "tool" ? "user" : m.role,
        content: m.role === "tool"
          ? [{ type: "tool_result" as const, tool_use_id: m.tool_call_id!, content: m.content }]
          : m.content,
      }));

    const systemMsg = request.messages.find(m => m.role === "system");

    const tools = request.tools?.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.max_tokens ?? 4096,
      messages,
    };

    if (systemMsg) body.system = systemMsg.content;
    if (tools?.length) body.tools = tools;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ProviderError("claude", res.status, err);
    }

    const data = await res.json();

    const textBlocks = data.content.filter((b: any) => b.type === "text");
    const toolBlocks = data.content.filter((b: any) => b.type === "tool_use");

    return {
      content: textBlocks.map((b: any) => b.text).join("") || null,
      tool_calls: toolBlocks.map((b: any) => ({
        id: b.id,
        type: "function" as const,
        function: {
          name: b.name,
          arguments: JSON.stringify(b.input),
        },
      })),
      finish_reason: data.stop_reason === "tool_use" ? "tool_calls" : "stop",
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
      },
    };
  }

  // stream() implementation similar pattern with Anthropic SSE format
  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    // Implementation follows Anthropic streaming API
    yield { type: "error", error: "Streaming not yet implemented for Claude" };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}
```

## Agent Orchestrator

The orchestrator converts user messages into executed actions through a loop:

```
User Message
    ↓
System Prompt + Context
    ↓
LLM Completion (with tools)
    ↓
┌─ If tool_calls:
│   ↓
│   For each tool call:
│     → Parse arguments (with Zod validation)
│     → Check if approval required
│     → If yes: show approval dialog, wait
│     → Execute tool
│     → Collect result
│   ↓
│   Feed tool results back to LLM
│   ↓
│   Loop (max iterations)
│
└─ If content only:
    ↓
    Return response to user
```

### Orchestrator Implementation

```typescript
// packages/shared/src/agent/orchestrator.ts
export interface AgentConfig {
  maxIterations: number;      // max tool-call loops (default: 10)
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  tools: ToolDefinition[];
  approvalRequired: string[]; // tool names requiring user approval
}

export interface AgentContext {
  conversationHistory: LLMMessage[];
  provider: LLMProvider;
  config: AgentConfig;
  toolExecutor: ToolExecutor;
  approvalHandler: ApprovalHandler;
  onStream?: (chunk: StreamChunk) => void;
  onToolCall?: (call: ToolCall) => void;
  onToolResult?: (callId: string, result: ToolResult) => void;
}

export async function runAgent(
  userMessage: string,
  ctx: AgentContext,
): Promise<AgentResult> {
  const messages: LLMMessage[] = [
    { role: "system", content: ctx.config.systemPrompt },
    ...ctx.conversationHistory,
    { role: "user", content: userMessage },
  ];

  let iterations = 0;

  while (iterations < ctx.config.maxIterations) {
    iterations++;

    let response: CompletionResponse;
    try {
      response = await ctx.provider.complete({
        messages,
        tools: ctx.config.tools,
        tool_choice: "auto",
        temperature: ctx.config.temperature,
        max_tokens: ctx.config.maxTokens,
      });
    } catch (err) {
      // Fallback logic: try next available provider
      if (err instanceof ProviderError && ctx.fallbackProvider) {
        response = await ctx.fallbackProvider.complete({ /* same params */ });
      } else {
        throw err;
      }
    }

    // If the model returned content with no tool calls, we're done
    if (response.finish_reason !== "tool_calls" || response.tool_calls.length === 0) {
      return {
        content: response.content ?? "",
        iterations,
        toolCallsExecuted: messages.filter(m => m.role === "tool").length,
      };
    }

    // Process tool calls
    const assistantMessage: LLMMessage = {
      role: "assistant",
      content: response.content,
      tool_calls: response.tool_calls,
    };
    messages.push(assistantMessage);

    for (const toolCall of response.tool_calls) {
      ctx.onToolCall?.(toolCall);

      // Parse and validate arguments
      let args: unknown;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "Invalid JSON arguments" }),
        });
        continue;
      }

      // Check if approval needed
      if (ctx.config.approvalRequired.includes(toolCall.function.name)) {
        const approved = await ctx.approvalHandler.requestApproval({
          tool: toolCall.function.name,
          arguments: args,
          description: describeToolCall(toolCall),
        });

        if (!approved) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "User denied this action" }),
          });
          continue;
        }
      }

      // Execute tool
      const result = await ctx.toolExecutor.execute(
        toolCall.function.name,
        args,
      );

      ctx.onToolResult?.(toolCall.id, result);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    content: "Reached maximum iterations without completing the task.",
    iterations,
    toolCallsExecuted: messages.filter(m => m.role === "tool").length,
    maxIterationsReached: true,
  };
}
```

## Tool Registry

```typescript
// packages/shared/src/agent/tools.ts
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolExecutor {
  execute(name: string, args: unknown): Promise<ToolResult>;
}

// Tool categories and approval requirements
export const TOOL_REGISTRY = {
  // File operations
  read_file: { approvalRequired: false },
  write_file: { approvalRequired: true },
  list_directory: { approvalRequired: false },
  delete_file: { approvalRequired: true },

  // Shell/process
  run_command: { approvalRequired: true },

  // Browser/web
  open_url: { approvalRequired: true },
  web_search: { approvalRequired: false },

  // Desktop control
  click: { approvalRequired: true },
  type_text: { approvalRequired: true },
  take_screenshot: { approvalRequired: false },

  // System
  get_system_info: { approvalRequired: false },
  install_package: { approvalRequired: true },
} as const;
```

## Structured Output Parsing

For local models (Qwen) that may produce unreliable JSON:

```typescript
export function parseToolCallArguments<T>(
  raw: string,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; error: string } {
  // Step 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    const validated = schema.safeParse(parsed);
    if (validated.success) return { success: true, data: validated.data };
    return { success: false, error: validated.error.message };
  } catch {
    // Step 2: Try extracting JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const validated = schema.safeParse(parsed);
        if (validated.success) return { success: true, data: validated.data };
      } catch { /* fall through */ }
    }

    // Step 3: Try extracting JSON object/array from text
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0]);
        const validated = schema.safeParse(parsed);
        if (validated.success) return { success: true, data: validated.data };
      } catch { /* fall through */ }
    }

    return { success: false, error: `Failed to parse: ${raw.slice(0, 200)}` };
  }
}
```

## Fallback Strategy

```typescript
export class ProviderRouter {
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private priority: ProviderType[];

  constructor(configs: ProviderConfig[], keychain: KeychainAccess) {
    // Build provider instances from config + keychain
    this.priority = configs
      .filter(c => c.enabled)
      .map(c => c.type);
  }

  async getAvailableProvider(): Promise<LLMProvider> {
    for (const type of this.priority) {
      const provider = this.providers.get(type);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }
    throw new Error("No AI provider available. Configure a provider in settings.");
  }

  async completeWithFallback(request: CompletionRequest): Promise<CompletionResponse> {
    const errors: string[] = [];

    for (const type of this.priority) {
      const provider = this.providers.get(type);
      if (!provider) continue;

      try {
        if (!await provider.isAvailable()) continue;
        return await provider.complete(request);
      } catch (err) {
        errors.push(`${type}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new Error(`All providers failed:\n${errors.join("\n")}`);
  }
}
```

## System Prompt Design

```typescript
export function buildSystemPrompt(context: {
  os: string;
  desktopVersion: string;
  availableTools: string[];
}): string {
  return `You are GORKH, a desktop AI assistant that helps users with tasks on their computer.

Operating System: ${context.os}
App Version: ${context.desktopVersion}

You have access to the following tools:
${context.availableTools.map(t => `- ${t}`).join("\n")}

Guidelines:
- Be direct and helpful. Execute tasks when you can.
- For sensitive operations (file writes, command execution, desktop control), the user will be asked to approve before execution.
- If a task requires multiple steps, plan them and execute one at a time.
- If a tool call fails, explain what happened and suggest alternatives.
- Never fabricate file contents or command outputs.
- If you need information you don't have, ask the user or use the appropriate tool.
- Keep responses concise. Users want results, not essays.
- When showing code or file contents, use the appropriate tool to write/display them.
- Screen data is never stored or sent to any server.`;
}
```

## Rules

- Provider keys are **never** sent to the GORKH server. They go directly from keychain → LLM API.
- The agent loop has a hard cap on iterations (default 10) to prevent runaway tool-call chains.
- All tool arguments are validated with Zod schemas before execution.
- Sensitive tools require local user approval — the agent must wait for the approval dialog.
- Streaming responses are preferred for UX. Fall back to non-streaming only when the provider doesn't support it.
- Local models (Qwen via Ollama) need robust JSON extraction — they sometimes wrap JSON in markdown.
- Provider fallback order is user-configurable. The default is: user's preferred → Free AI → error.
- Screen frames captured for tool use are never persisted to disk or sent to the server.
- Error messages from provider failures must be user-friendly, not raw HTTP errors.
- Agent state (conversation history) lives in memory on the desktop — not on the server.
