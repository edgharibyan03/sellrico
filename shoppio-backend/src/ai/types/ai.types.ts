export type PlanId = 'free' | 'pro' | 'business';

export type AIProviderName = 'openai' | 'deepseek';

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  /** Required for tool-result messages */
  toolCallId?: string;
  name?: string;
  /** Required on assistant turns that requested tools */
  toolCalls?: AIToolCall[];
}

export interface AIToolParameterProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: AIToolParameterProperty;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameterProperty>;
    required?: string[];
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIChatRequest {
  system?: string;
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatResponse {
  content: string | null;
  toolCalls: AIToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error';
  provider: AIProviderName;
  model: string;
}

export interface AIStreamChunk {
  type: 'delta' | 'tool_call' | 'done' | 'error';
  text?: string;
  toolCall?: Partial<AIToolCall> & { index?: number };
  errorMessage?: string;
}
