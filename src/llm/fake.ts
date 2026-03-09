import type { ChatMessage, LlmClient } from "./types";

export class FakeLlm implements LlmClient {
	async generateReply(
		messages: ChatMessage[],
		_onChunk?: (chunk: string) => void,
	): Promise<string> {
		const lastUser = [...messages].reverse().find((m) => m.role === "user");
		return lastUser ? `echo: ${lastUser.content}` : "echo: <no-input>";
	}

	async summarize(text: string): Promise<string> {
		const trimmed = text.trim();
		if (trimmed === "") return "summary: <empty>";
		const max = 32;
		const snippet =
			trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
		return `summary: ${snippet}`;
	}
}
