import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigManager } from "../src/config/configManager";
import { CONFIG_KEYS } from "../src/config/schema";
import { Storage } from "../src/storage/storage";

test("ConfigManager set and getConfig work together", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });
	const manager = new ConfigManager(storage);

	try {
		await storage.ensureInitialized();
		await manager.set(CONFIG_KEYS.OPENAI_API_KEY, "sk-test-123");

		const cfg = await manager.getConfig();
		expect(cfg[CONFIG_KEYS.OPENAI_API_KEY]).toBe("sk-test-123");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("ConfigManager listEntries masks values", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });
	const manager = new ConfigManager(storage);

	try {
		await storage.ensureInitialized();
		await manager.set(CONFIG_KEYS.OPENAI_API_KEY, "sk-1234567890");

		const entries = await manager.listEntries();
		const entry = entries.find((e) => e.key === CONFIG_KEYS.OPENAI_API_KEY);
		expect(entry).toBeDefined();
		expect(entry?.masked).not.toBe(entry?.value);
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("ConfigManager set and get OPENAI_API_BASE and OPENAI_MODEL_NAME", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });
	const manager = new ConfigManager(storage);

	try {
		await storage.ensureInitialized();
		await manager.set(
			CONFIG_KEYS.OPENAI_API_BASE,
			"https://api.example.com/v1",
		);
		await manager.set(CONFIG_KEYS.OPENAI_MODEL_NAME, "gpt-4o");

		const cfg = await manager.getConfig();
		expect(cfg[CONFIG_KEYS.OPENAI_API_BASE]).toBe("https://api.example.com/v1");
		expect(cfg[CONFIG_KEYS.OPENAI_MODEL_NAME]).toBe("gpt-4o");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});
