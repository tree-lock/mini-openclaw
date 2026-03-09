import readline from "node:readline";

import chalk from "chalk";

import { ConfigManager } from "../config/configManager";
import { CONFIG_KEYS } from "../config/schema";
import { OpenAiLlm } from "../llm/openaiAdapter";
import type { ChatMessage } from "../llm/types";
import { MemoryService } from "../memory/memoryService";
import { Storage } from "../storage/storage";

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
		// eslint-disable-next-line no-console
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

	const history = await storage.readText(storage.paths.chatMd);
	if (history.trim()) {
		// eslint-disable-next-line no-console
		console.log(chalk.gray("Previous chat history:"));
		// eslint-disable-next-line no-console
		console.log(history);
	}

	const memorySummary = await memory.loadSummary();

	const messages: ChatMessage[] = [];
	if (memorySummary.trim()) {
		messages.push({
			role: "system",
			content: `以下是你与用户以往对话的记忆摘要，请在后续对话中参考：\n\n${memorySummary}`,
		});
	}

	// eslint-disable-next-line no-console
	console.log(
		chalk.cyan(
			"Enter chat mode. Type /exit to quit, /summarize to summarize current session.",
		),
	);

	const rl = createRl();
	const sessionLines: string[] = [];

	try {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			// eslint-disable-next-line no-await-in-loop
			const input = (await askLine(rl, chalk.green("> "))).trim();

			if (input === "") continue;

			if (input === "/exit") {
				if (sessionLines.length > 0) {
					// eslint-disable-next-line no-console
					console.log(chalk.cyan("Exiting and saving memory..."));
				} else {
					// eslint-disable-next-line no-console
					console.log(chalk.cyan("Exiting."));
				}
				break;
			}

			if (input === "/summarize") {
				const sessionText = sessionLines.join("\n");
				// eslint-disable-next-line no-await-in-loop
				const summary = await llm.summarize(sessionText);
				const now = new Date().toISOString();
				const block = `\n### Session Summary (${now})\n\n${summary}\n`;
				// eslint-disable-next-line no-await-in-loop
				await storage.appendText(storage.paths.chatMd, block);
				// eslint-disable-next-line no-console
				console.log(chalk.magenta(summary));
				continue;
			}

			sessionLines.push(`User: ${input}`);
			messages.push({ role: "user", content: input });

			const onChunk = (chunk: string) => {
				process.stdout.write(chalk.blue(chunk));
			};
			// eslint-disable-next-line no-await-in-loop
			const reply = await llm.generateReply(messages, onChunk);
			process.stdout.write("\n");
			sessionLines.push(`Assistant: ${reply}`);
			messages.push({ role: "assistant", content: reply });

			const now = new Date().toISOString();
			const block = `\n## Turn at ${now}\n\n**User**: ${input}\n\n**Assistant**: ${reply}\n`;
			// eslint-disable-next-line no-await-in-loop
			await storage.appendText(storage.paths.chatMd, block);
		}

		const sessionText = sessionLines.join("\n");
		if (sessionText.trim()) {
			// eslint-disable-next-line no-console
			console.log(chalk.cyan("Saving session to memory..."));
			await memory.summarizeSessionAndSave(sessionText);
		}
	} finally {
		rl.close();
	}
}
