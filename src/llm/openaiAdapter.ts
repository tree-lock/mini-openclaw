import OpenAI from "openai";

import type {
	ChatMessage,
	CompletionMessage,
	GenerateReplyWithToolsResult,
	LlmClient,
	ToolCall,
} from "./types";

const RUN_SHELL_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
	type: "function",
	function: {
		name: "run_shell",
		description:
			"在用户机器上执行单条只读或列出类 shell 命令，例如列出目录、查看文件内容、查询环境等。不要执行会修改系统或删除数据的命令。",
		parameters: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: "要执行的 shell 命令，如 ls -l ~/Desktop",
				},
			},
			required: ["command"],
		},
	},
};

function toOpenAiMessage(
	m: CompletionMessage,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
	if (m.role === "tool") {
		return { role: "tool", content: m.content, tool_call_id: m.tool_call_id };
	}
	if (m.role === "assistant" && "tool_calls" in m && m.tool_calls?.length) {
		return {
			role: "assistant",
			content: m.content ?? null,
			tool_calls: m.tool_calls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.name, arguments: tc.arguments },
			})),
		};
	}
	if (m.role === "system") {
		return { role: "system", content: m.content };
	}
	if (m.role === "user") {
		return { role: "user", content: m.content };
	}
	return { role: "assistant", content: m.content };
}

function normalizeToolCallArgs(name: string, args: string): string {
	if (name !== "run_shell") return args;
	try {
		const o = JSON.parse(args) as Record<string, unknown>;
		if (typeof o !== "object" || o === null) return '{"command":""}';
		const cmd = typeof o.command === "string" ? o.command : "";
		return JSON.stringify({ command: cmd });
	} catch {
		const match = args.match(/"command"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
		const cmd = match?.[1] ?? "";
		return JSON.stringify({ command: cmd });
	}
}

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

	async generateReplyWithTools(
		messages: CompletionMessage[],
		onChunk?: (chunk: string) => void,
	): Promise<GenerateReplyWithToolsResult> {
		const messagePayload = messages.map(toOpenAiMessage);

		if (onChunk) {
			let fullContent = "";
			const toolCallsByIndex = new Map<
				number,
				{ id: string; name: string; args: string }
			>();
			const stream = await this.client.chat.completions.create({
				model: this.chatModel,
				messages: messagePayload,
				tools: [RUN_SHELL_TOOL],
				tool_choice: "auto",
				stream: true,
			});
			try {
				for await (const chunk of stream) {
					const delta = chunk.choices[0]?.delta;
					if (!delta) continue;
					if (typeof delta.content === "string" && delta.content.length > 0) {
						fullContent += delta.content;
						onChunk(delta.content);
					}
					for (const tc of delta.tool_calls ?? []) {
						const idx = tc.index ?? 0;
						const cur = toolCallsByIndex.get(idx) ?? {
							id: tc.id ?? "",
							name: tc.function?.name ?? "",
							args: tc.function?.arguments ?? "",
						};
						if (tc.id) cur.id = tc.id;
						if (tc.function?.name) cur.name = tc.function.name;
						if (tc.function?.arguments !== undefined)
							cur.args += tc.function.arguments;
						toolCallsByIndex.set(idx, cur);
					}
				}
			} catch {
				// On stream error, return whatever we have
			}
			const toolCalls: ToolCall[] = [];
			for (const [, v] of [...toolCallsByIndex.entries()].sort(
				(a, b) => a[0] - b[0],
			)) {
				if (v.id && v.name) {
					toolCalls.push({
						id: v.id,
						name: v.name,
						arguments: normalizeToolCallArgs(v.name, v.args),
					});
				}
			}
			return { content: fullContent, toolCalls };
		}

		const completion = await this.client.chat.completions.create({
			model: this.chatModel,
			messages: messagePayload,
			tools: [RUN_SHELL_TOOL],
			tool_choice: "auto",
		});

		const msg = completion.choices[0]?.message;
		if (!msg) {
			return { content: "", toolCalls: [] };
		}

		const toolCalls: ToolCall[] = [];
		if (msg.tool_calls?.length) {
			for (const tc of msg.tool_calls) {
				if (tc.type === "function" && tc.function) {
					const name = tc.function.name ?? "";
					const args = tc.function.arguments ?? "";
					toolCalls.push({
						id: tc.id,
						name,
						arguments: normalizeToolCallArgs(name, args),
					});
				}
			}
		}

		if (toolCalls.length > 0) {
			return {
				content: typeof msg.content === "string" ? msg.content : "",
				toolCalls,
			};
		}

		const content = typeof msg.content === "string" ? msg.content : "";
		return { content, toolCalls: [] };
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
