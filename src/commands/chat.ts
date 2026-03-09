import chalk from "chalk";

import { runChatSession } from "../chat/chatSession";
import { toErrorMessage } from "../utils/errorMessage";

export async function runChatCommand(): Promise<void> {
	try {
		await runChatSession();
	} catch (error) {
		const message = toErrorMessage(error);
		console.error(chalk.red(`Chat failed: ${message}`));
	}
}
