import OpenAI from "openai";

import type { ChatMessage, LlmClient } from "./types";

export interface OpenAiLlmOptions {
	apiKey: string;
	baseURL?: string;
	chatModel?: string;
	summarizeModel?: string;
}

export class OpenAiLlm implements LlmClient {
	private readonly client: OpenAI;
	private readonly chatModel: string;
	private readonly summarizeModel: string;

	constructor(opts: OpenAiLlmOptions) {
		const clientOpts: { apiKey: string; baseURL?: string } = {
			apiKey: opts.apiKey,
		};
		if (opts.baseURL?.trim()) {
			clientOpts.baseURL = opts.baseURL.trim();
		}
		this.client = new OpenAI(clientOpts);
		this.chatModel = opts.chatModel ?? "gpt-4o-mini";
		this.summarizeModel = opts.summarizeModel ?? this.chatModel;
	}

	async generateReply(
		messages: ChatMessage[],
		onChunk?: (chunk: string) => void,
	): Promise<string> {
		const messagePayload = messages.map((m) => ({
			role: m.role,
			content: m.content,
		}));

		if (onChunk) {
			let fullContent = "";
			const stream = await this.client.chat.completions.create({
				model: this.chatModel,
				messages: messagePayload,
				stream: true,
			});
			try {
				for await (const chunk of stream) {
					const delta = chunk.choices[0]?.delta?.content;
					if (typeof delta === "string" && delta.length > 0) {
						fullContent += delta;
						onChunk(delta);
					}
				}
			} catch {
				// On stream error, return whatever we accumulated so far
			}
			return fullContent;
		}

		const completion = await this.client.chat.completions.create({
			model: this.chatModel,
			messages: messagePayload,
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) return "";
		return content;
	}

	async summarize(text: string): Promise<string> {
		const completion = await this.client.chat.completions.create({
			model: this.summarizeModel,
			messages: [
				{
					role: "system",
					content:
						"你是一个擅长中文总结的助手，请用简洁的 Markdown 总结下面的对话内容。",
				},
				{
					role: "user",
					content: text,
				},
			],
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) return "";
		return content;
	}
}
