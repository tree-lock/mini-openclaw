import readline from "node:readline";

import chalk from "chalk";

import { runCommand } from "../command-exec";
import { ConfigManager } from "../config/configManager";
import { CONFIG_KEYS } from "../config/schema";
import { OpenAiLlm } from "../llm/openaiAdapter";
import type { CompletionMessage } from "../llm/types";
import { MemoryService } from "../memory/memoryService";
import { PersonalityService } from "../personality/personalityService";
import { Storage } from "../storage/storage";
import { toErrorMessage } from "../utils/errorMessage";

const MAX_TOOL_ROUNDS = 3;

export function buildBootstrapSystemMessages(opts: {
	memorySummary: string;
	personalityMd: string;
}): CompletionMessage[] {
	const blocks: string[] = [];
	if (opts.memorySummary.trim()) {
		blocks.push(
			`## Memory\n以下是你与用户以往对话的记忆摘要，请在后续对话中参考：\n\n${opts.memorySummary.trim()}`,
		);
	}
	if (opts.personalityMd.trim()) {
		blocks.push(
			`## Personality\n以下是 assistant 的人格与行为约束（来自 personality.md）。请在后续对话中遵循：\n\n${opts.personalityMd.trim()}`,
		);
	}
	if (blocks.length === 0) return [];
	return [{ role: "system", content: blocks.join("\n\n---\n\n") }];
}

/**
 * Clears chat history and long-term memory files. Used by /clear and tests.
 */
export async function clearSessionData(storage: Storage): Promise<void> {
	await storage.ensureInitialized();
	await storage.writeText(storage.paths.chatMd, "");
	await storage.writeText(storage.paths.memoryMd, "");
}

function createRl() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
}

function askLine(rl: readline.Interface, prompt: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(prompt, (answer) => {
			resolve(answer);
		});
	});
}

export async function runChatSession(): Promise<void> {
	const storage = new Storage();
	const cfg = new ConfigManager(storage);

	await storage.ensureInitialized();

	const config = await cfg.getConfig();
	const apiKey = config[CONFIG_KEYS.OPENAI_API_KEY];
	const apiBase = config[CONFIG_KEYS.OPENAI_API_BASE]?.trim();
	const modelName = config[CONFIG_KEYS.OPENAI_MODEL_NAME]?.trim();

	if (!apiKey || apiKey.trim() === "") {
		console.error(
			chalk.red(
				"OPENAI_API_KEY is not configured. Please run `tclaw config` to set it before chatting.",
			),
		);
		return;
	}

	const llm = new OpenAiLlm({
		apiKey,
		...(apiBase && { baseURL: apiBase }),
		...(modelName && {
			chatModel: modelName,
			summarizeModel: modelName,
		}),
	});
	const memory = new MemoryService(storage, llm);
	const personality = new PersonalityService(storage);

	const history = await storage.readText(storage.paths.chatMd);
	if (history.trim()) {
		console.log(chalk.gray("Previous chat history:"));
		console.log(history);
	}

	const memorySummary = await memory.loadSummary();
	const personalityMd = await personality.load();

	const messages: CompletionMessage[] = buildBootstrapSystemMessages({
		memorySummary,
		personalityMd,
	});

	console.log(
		chalk.cyan(
			"Enter chat mode. Type /exit to quit, /summarize to summarize current session, /clear to clear all history and memory.",
		),
	);

	const rl = createRl();
	const sessionLines: string[] = [];

	try {
		while (true) {
			const input = (await askLine(rl, chalk.green("> "))).trim();

			if (input === "") continue;

			if (input === "/clear") {
				console.log(
					chalk.yellow(
						"此操作将删除所有历史对话与长期记忆（chat.md 与 memory.md），且不可恢复。",
					),
				);
				const confirm = await askLine(
					rl,
					chalk.yellow(
						"确认清空所有历史与记忆？输入 yes 继续，其他任意输入取消。\n> ",
					),
				);
				const confirmed =
					confirm.trim().toLowerCase() === "yes" ||
					confirm.trim().toLowerCase() === "y";
				if (confirmed) {
					await clearSessionData(storage);
					sessionLines.length = 0;
					messages.length = 0;
					const newMemorySummary = "";
					const newPersonalityMd = await personality.load();
					messages.push(
						...buildBootstrapSystemMessages({
							memorySummary: newMemorySummary,
							personalityMd: newPersonalityMd,
						}),
					);
					console.log(chalk.cyan("已清空历史与记忆，当前对话从零开始。"));
				} else {
					console.log(chalk.gray("已取消清空操作。"));
				}
				continue;
			}

			if (input === "/exit") {
				if (sessionLines.length > 0) {
					console.log(chalk.cyan("Exiting and saving memory..."));
				} else {
					console.log(chalk.cyan("Exiting."));
				}
				break;
			}

			if (input === "/summarize") {
				const sessionText = sessionLines.join("\n");
				const summary = await llm.summarize(sessionText);
				const now = new Date().toISOString();
				const block = `\n### Session Summary (${now})\n\n${summary}\n`;
				await storage.appendText(storage.paths.chatMd, block);
				console.log(chalk.magenta(summary));
				continue;
			}

			sessionLines.push(`User: ${input}`);
			messages.push({ role: "user", content: input });

			const spinnerFrames = ["⠋", "⠙", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
			let spinnerActive = true;
			let spinnerInterval: ReturnType<typeof setInterval> | null = null;
			process.stdout.write(chalk.gray("Thinking "));
			let frameIndex = 0;
			spinnerInterval = setInterval(() => {
				if (!spinnerActive) return;
				const frame = spinnerFrames[frameIndex % spinnerFrames.length];
				frameIndex += 1;
				process.stdout.write(`\r${chalk.gray(`Thinking ${frame}`)}`);
			}, 80);

			let replyWasStreamed = false;
			const onChunk = (chunk: string) => {
				replyWasStreamed = true;
				if (spinnerActive) {
					spinnerActive = false;
					if (spinnerInterval) {
						clearInterval(spinnerInterval);
						spinnerInterval = null;
					}
					process.stdout.write(`\r${" ".repeat(16)}\r\n`);
				}
				process.stdout.write(chalk.blue(chunk));
			};

			let reply: string;
			let lastToolOutput: string | null = null;
			try {
				let result = await llm.generateReplyWithTools(messages, onChunk);
				let rounds = 0;
				while (result.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
					if (spinnerActive && spinnerInterval) {
						spinnerActive = false;
						clearInterval(spinnerInterval);
						spinnerInterval = null;
						process.stdout.write(`\r${" ".repeat(16)}\r\n`);
						console.log(chalk.gray("正在执行命令…"));
					}
					messages.push({
						role: "assistant",
						content: result.content,
						tool_calls: result.toolCalls,
					});
					for (const tc of result.toolCalls) {
						if (tc.name !== "run_shell") continue;
						let args: { command?: string };
						try {
							args = JSON.parse(tc.arguments) as {
								command?: string;
							};
						} catch {
							messages.push({
								role: "tool",
								content: "Invalid arguments",
								tool_call_id: tc.id,
							});
							continue;
						}
						const cmd = typeof args.command === "string" ? args.command : "";
						if (cmd.trim() === "") {
							messages.push({
								role: "tool",
								content:
									"命令为空或参数无效。请勿再次调用 run_shell，直接使用文字回答用户（例如说明无法执行命令或根据已有信息回答即可）。",
								tool_call_id: tc.id,
							});
							continue;
						}
						console.log(chalk.gray(`执行命令: ${cmd}`));
						const execResult = await runCommand(cmd);
						const toolOutput =
							execResult.code !== null
								? `exit ${execResult.code}\n${execResult.stdout}${execResult.stderr ? `\nstderr:\n${execResult.stderr}` : ""}`
								: execResult.stderr;
						lastToolOutput = toolOutput;
						messages.push({
							role: "tool",
							content: toolOutput,
							tool_call_id: tc.id,
						});
					}
					rounds += 1;
					result = await llm.generateReplyWithTools(messages, onChunk);
				}
				reply = result.content.trim();
				if (reply === "" && lastToolOutput !== null) {
					const snippet =
						lastToolOutput.length > 400
							? `${lastToolOutput.slice(0, 400)}\n...`
							: lastToolOutput;
					reply = `命令已执行。模型未返回总结，原始输出：\n\n${snippet}`;
				}
				if (reply === "") {
					reply = "（模型未返回内容）";
				}
			} catch (err) {
				if (spinnerActive && spinnerInterval) {
					clearInterval(spinnerInterval);
					process.stdout.write(`\r${" ".repeat(16)}\r\n`);
				}
				const msg = toErrorMessage(err);
				console.error(chalk.red(`请求失败: ${msg}，请稍后重试。`));
				sessionLines.pop();
				messages.pop();
				continue;
			} finally {
				if (spinnerInterval) clearInterval(spinnerInterval);
				spinnerActive = false;
			}
			if (!replyWasStreamed) {
				// 工具调用后的最终回复未走流式，需在此输出并与「执行命令」分隔开
				process.stdout.write("\n");
				process.stdout.write(chalk.blue(reply));
				process.stdout.write("\n");
			}
			process.stdout.write("\n");
			sessionLines.push(`Assistant: ${reply}`);
			messages.push({ role: "assistant", content: reply });

			const now = new Date().toISOString();
			const block = `\n## Turn at ${now}\n\n**User**: ${input}\n\n**Assistant**: ${reply}\n`;
			await storage.appendText(storage.paths.chatMd, block);
		}

		const sessionText = sessionLines.join("\n");
		if (sessionText.trim()) {
			console.log(chalk.cyan("Saving session to memory..."));
			await memory.summarizeSessionAndSave(sessionText);
		}
	} finally {
		rl.close();
	}
}
