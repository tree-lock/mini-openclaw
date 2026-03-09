import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { clearSessionData } from "../src/chat/chatSession";
import { Storage } from "../src/storage/storage";

test("clearSessionData clears chat.md and memory.md", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-clear-"));
	const storage = new Storage({ baseDir: base });

	try {
		await storage.ensureInitialized();
		await storage.writeText(storage.paths.chatMd, "## Old chat\n\nHello");
		await storage.writeText(
			storage.paths.memoryMd,
			"# Conversation Memory\n\nSome summary",
		);

		await clearSessionData(storage);

		const chatContent = await storage.readText(storage.paths.chatMd);
		const memoryContent = await storage.readText(storage.paths.memoryMd);
		expect(chatContent).toBe("");
		expect(memoryContent).toBe("");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});
