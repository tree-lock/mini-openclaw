import chalk from "chalk";

import { runChatSession } from "../chat/chatSession";

export async function runChatCommand(): Promise<void> {
	try {
		await runChatSession();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// eslint-disable-next-line no-console
		console.error(chalk.red(`Chat failed: ${message}`));
	}
}
