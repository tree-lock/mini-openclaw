import type { LlmClient } from "../llm/types";
import type { Storage } from "../storage/storage";

export class MemoryService {
	constructor(
		private readonly storage: Storage,
		private readonly llm: LlmClient,
	) {}

	async loadSummary(): Promise<string> {
		await this.storage.ensureInitialized();
		const content = await this.storage.readText(this.storage.paths.memoryMd);
		return content;
	}

	async summarizeSessionAndSave(text: string): Promise<string> {
		await this.storage.ensureInitialized();
		const existing = await this.storage.readText(this.storage.paths.memoryMd);
		const summary = await this.llm.summarizeMerge(existing, text);
		const now = new Date().toISOString();
		const md = `# Conversation Memory\n\n_Last updated: ${now}_\n\n${summary}\n`;
		await this.storage.writeText(this.storage.paths.memoryMd, md);
		return summary;
	}
}
