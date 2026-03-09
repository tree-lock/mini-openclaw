import { Command } from "commander";

import { runChatCommand } from "./commands/chat";
import { runConfigCommand, runConfigListCommand } from "./commands/config";

export async function runCli(): Promise<void> {
	const program = new Command();

	program.name("tclaw").description("mini-openclaw CLI");

	const config = program.command("config").description("配置 mini-openclaw");
	config.action(async () => {
		await runConfigCommand();
	});

	config
		.command("list")
		.description("查看当前配置（脱敏）")
		.action(async () => {
			await runConfigListCommand();
		});

	program
		.command("chat")
		.description("进入对话界面")
		.action(async () => {
			await runChatCommand();
		});

	await program.parseAsync(process.argv);
}
