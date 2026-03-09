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

	async summarizeMerge(
		existingMemory: string,
		newSessionText: string,
	): Promise<string> {
		const systemPrompt =
			"你是一个擅长中文总结的助手。下面会给出两部分内容：一、现有的长期记忆摘要（可能含标题与更新时间）；二、本轮完整对话文本。请生成一份新的长期记忆摘要（Markdown），保留仍然有效的旧信息，并加入本轮对话中的稳定事实，避免重复，保持简洁。";
		const userContent = `## 现有长期记忆\n\n${existingMemory.trim() || "（无）"}\n\n## 本轮对话\n\n${newSessionText}`;
		const completion = await this.client.chat.completions.create({
			model: this.summarizeModel,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userContent },
			],
		});
		const content = completion.choices[0]?.message?.content;
		if (!content) return "";
		return content;
	}
}
