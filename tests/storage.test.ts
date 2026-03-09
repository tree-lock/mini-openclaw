import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Storage } from "../src/storage/storage";

test("Storage.ensureInitialized creates required files", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });

	try {
		await storage.ensureInitialized();

		expect(await storage.exists(storage.paths.configJson)).toBe(true);
		expect(await storage.exists(storage.paths.chatMd)).toBe(true);
		expect(await storage.exists(storage.paths.memoryMd)).toBe(true);
		expect(await storage.exists(storage.paths.skillMd)).toBe(true);
		expect(await storage.exists(storage.paths.personalityMd)).toBe(true);

		const cfg = await storage.readJson<Record<string, unknown>>(
			storage.paths.configJson,
		);
		expect(cfg).toEqual({});
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("Storage can write/read JSON", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-"));
	const storage = new Storage({ baseDir: base });

	try {
		await storage.ensureInitialized();
		await storage.writeJson(storage.paths.configJson, { OPENAI_API_KEY: "x" });
		const cfg = await storage.readJson<Record<string, unknown>>(
			storage.paths.configJson,
		);
		expect(cfg.OPENAI_API_KEY).toBe("x");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});
