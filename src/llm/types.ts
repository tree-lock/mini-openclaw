export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
	role: ChatRole;
	content: string;
}

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
}
