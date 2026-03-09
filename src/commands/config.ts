import { intro, isCancel, outro, select, text } from "@clack/prompts";
import chalk from "chalk";

import { ConfigManager } from "../config/configManager";
import { CONFIG_KEYS } from "../config/schema";
import { Storage } from "../storage/storage";

export async function runConfigCommand(): Promise<void> {
	const storage = new Storage();
	const manager = new ConfigManager(storage);

	await storage.ensureInitialized();

	intro("tclaw config");

	const target = await select<"TELEGRAM" | "OPENAI">({
		message: "Choose the configuration you want to configure:",
		options: [
			{ value: "TELEGRAM", label: "TELEGRAM BOT" },
			{ value: "OPENAI", label: "OPENAI" },
		],
	});

	if (isCancel(target)) {
		outro("Cancelled.");
		return;
	}

	if (target === "TELEGRAM") {
		const token = await text({
			message: "TELEGRAM_BOT_TOKEN, Enter the value",
		});
		if (isCancel(token)) {
			outro("Cancelled.");
			return;
		}
		await manager.set(CONFIG_KEYS.TELEGRAM_BOT_TOKEN, String(token));
	} else if (target === "OPENAI") {
		const openaiConfig = await manager.getConfig();
		const hasApiKey = Boolean(openaiConfig[CONFIG_KEYS.OPENAI_API_KEY]?.trim());
		const hasBase = Boolean(openaiConfig[CONFIG_KEYS.OPENAI_API_BASE]?.trim());
		const hasModel = Boolean(
			openaiConfig[CONFIG_KEYS.OPENAI_MODEL_NAME]?.trim(),
		);
		const allConfigured = hasApiKey && hasBase && hasModel;

		type OpenAiChoice = "ALL" | "API_KEY" | "BASE_URL" | "MODEL_NAME";
		const openaiChoice = await select<OpenAiChoice>({
			message: "Choose the openai configuration you want to configure:",
			options: [
				{
					value: "ALL",
					label: `[1] ALL${allConfigured ? " [Configured]" : ""}`,
				},
				{
					value: "API_KEY",
					label: `[2] API KEY (Required)${hasApiKey ? " [Configured]" : ""}`,
				},
				{
					value: "BASE_URL",
					label: `[3] BASE URL${hasBase ? " [Configured]" : ""}`,
				},
				{
					value: "MODEL_NAME",
					label: `[4] MODEL NAME${hasModel ? " [Configured]" : ""}`,
				},
			],
		});

		if (isCancel(openaiChoice)) {
			outro("Cancelled.");
			return;
		}

		if (openaiChoice === "ALL") {
			const apiKey = await text({
				message: "OPENAI_API_KEY, Enter the value",
			});
			if (isCancel(apiKey)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_API_KEY, String(apiKey));

			const baseUrl = await text({
				message: "BASE URL, Enter the value",
			});
			if (isCancel(baseUrl)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_API_BASE, String(baseUrl));

			const modelName = await text({
				message: "MODEL NAME, Enter the value",
			});
			if (isCancel(modelName)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_MODEL_NAME, String(modelName));
		} else if (openaiChoice === "API_KEY") {
			const apiKey = await text({
				message: "OPENAI_API_KEY, Enter the value",
			});
			if (isCancel(apiKey)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_API_KEY, String(apiKey));
		} else if (openaiChoice === "BASE_URL") {
			const baseUrl = await text({
				message: "BASE URL, Enter the value",
			});
			if (isCancel(baseUrl)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_API_BASE, String(baseUrl));
		} else if (openaiChoice === "MODEL_NAME") {
			const modelName = await text({
				message: "MODEL NAME, Enter the value",
			});
			if (isCancel(modelName)) {
				outro("Cancelled.");
				return;
			}
			await manager.set(CONFIG_KEYS.OPENAI_MODEL_NAME, String(modelName));
		}
	}

	outro(chalk.green("Configuration saved."));
}

export async function runConfigListCommand(): Promise<void> {
	const storage = new Storage();
	const manager = new ConfigManager(storage);

	await storage.ensureInitialized();

	const entries = await manager.listEntries();

	if (entries.length === 0) {
		// eslint-disable-next-line no-console
		console.log(chalk.yellow("No configuration found."));
		return;
	}

	// eslint-disable-next-line no-console
	console.log(chalk.cyan("Current configuration (masked):"));
	for (const entry of entries) {
		// eslint-disable-next-line no-console
		console.log(`- ${chalk.white(entry.key)} = ${chalk.gray(entry.masked)}`);
	}
}
