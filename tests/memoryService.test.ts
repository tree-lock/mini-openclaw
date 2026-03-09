import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FakeLlm } from "../src/llm/fake";
import { MemoryService } from "../src/memory/memoryService";
import { Storage } from "../src/storage/storage";

test("MemoryService summarizeSessionAndSave writes summary to memory.md", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });
	const llm = new FakeLlm();
	const memory = new MemoryService(storage, llm);

	try {
		await storage.ensureInitialized();
		const summary = await memory.summarizeSessionAndSave("hello world");
		expect(summary).toContain("summary:");

		const content = await storage.readText(storage.paths.memoryMd);
		expect(content).toContain("Conversation Memory");
		expect(content).toContain("summary:");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("MemoryService summarizeSessionAndSave merges with existing memory", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });
	const llm = new FakeLlm();
	const memory = new MemoryService(storage, llm);

	try {
		await storage.ensureInitialized();
		const oldMemory =
			"# Conversation Memory\n\n_Last updated: 2020-01-01_\n\n用户喜欢 TypeScript。";
		await storage.writeText(storage.paths.memoryMd, oldMemory);

		const summary = await memory.summarizeSessionAndSave(
			"User: 今天天气怎样\nAssistant: 晴天",
		);
		expect(summary).toContain("summary:");
		expect(summary).toContain("[merged]");

		const content = await storage.readText(storage.paths.memoryMd);
		expect(content).toContain("Conversation Memory");
		expect(content).toContain("[merged]");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});
