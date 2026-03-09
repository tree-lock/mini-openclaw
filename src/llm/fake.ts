import type {
	ChatMessage,
	CompletionMessage,
	GenerateReplyWithToolsResult,
	LlmClient,
} from "./types";

export class FakeLlm implements LlmClient {
	async generateReply(
		messages: ChatMessage[],
		_onChunk?: (chunk: string) => void,
	): Promise<string> {
		const lastUser = [...messages].reverse().find((m) => m.role === "user");
		return lastUser ? `echo: ${lastUser.content}` : "echo: <no-input>";
	}

	async generateReplyWithTools(
		messages: CompletionMessage[],
		_onChunk?: (chunk: string) => void,
	): Promise<GenerateReplyWithToolsResult> {
		const lastUser = [...messages].reverse().find((m) => m.role === "user");
		const content = lastUser ? `echo: ${lastUser.content}` : "echo: <no-input>";
		return { content, toolCalls: [] };
	}

	async summarize(text: string): Promise<string> {
		const trimmed = text.trim();
		if (trimmed === "") return "summary: <empty>";
		const max = 32;
		const snippet =
			trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
		return `summary: ${snippet}`;
	}

	async summarizeMerge(
		existingMemory: string,
		newSessionText: string,
	): Promise<string> {
		const existing = existingMemory.trim();
		const newSnippet = newSessionText.trim().slice(0, 32);
		const part =
			newSessionText.trim().length > 32 ? `${newSnippet}...` : newSnippet;
		if (existing) return `summary: [merged] ${part}`;
		return `summary: ${part || "<empty>"}`;
	}
}
