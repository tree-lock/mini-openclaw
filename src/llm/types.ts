export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
	role: ChatRole;
	content: string;
}

export interface ToolCall {
	id: string;
	name: string;
	arguments: string;
}

export interface GenerateReplyWithToolsResult {
	content: string;
	toolCalls: ToolCall[];
}

export type CompletionMessage =
	| { role: "system"; content: string }
	| { role: "user"; content: string }
	| { role: "assistant"; content: string }
	| { role: "assistant"; content?: string; tool_calls: ToolCall[] }
	| { role: "tool"; content: string; tool_call_id: string };

export interface LlmClient {
	/**
	 * Generate a reply for the given messages.
	 * When `onChunk` is provided, the implementation may call it for each streamed text fragment; the returned value is still the full reply.
	 */
	generateReply(
		messages: ChatMessage[],
		onChunk?: (chunk: string) => void,
	): Promise<string>;
	summarize(text: string): Promise<string>;
	/**
	 * Merge existing long-term memory with new session text into an updated summary.
	 */
	summarizeMerge(
		existingMemory: string,
		newSessionText: string,
	): Promise<string>;
	/**
	 * Generate a reply with optional tool use. When the model returns tool_calls,
	 * returns them so the caller can execute and call again with tool results.
	 * Uses non-streaming for tool rounds to simplify tool_calls handling.
	 */
	generateReplyWithTools(
		messages: CompletionMessage[],
		onChunk?: (chunk: string) => void,
	): Promise<GenerateReplyWithToolsResult>;
}
