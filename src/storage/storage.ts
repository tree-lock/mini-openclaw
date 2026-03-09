import { constants } from "node:fs";
import {
	access,
	appendFile,
	mkdir,
	readFile,
	writeFile,
} from "node:fs/promises";

import { getDefaultBaseDir, getTclawPaths, type TclawPaths } from "./paths";

type JsonObject = Record<string, unknown>;

export class Storage {
	readonly paths: TclawPaths;
	readonly baseDir: string;

	constructor(opts?: { baseDir?: string }) {
		this.baseDir = opts?.baseDir ?? getDefaultBaseDir();
		this.paths = getTclawPaths(this.baseDir);
	}

	async ensureInitialized(): Promise<void> {
		await mkdir(this.baseDir, { recursive: true });

		await Promise.all([
			this.ensureJsonFile(this.paths.configJson, {}),
			this.ensureTextFile(this.paths.chatMd, ""),
			this.ensureTextFile(this.paths.memoryMd, ""),
			this.ensureTextFile(this.paths.skillMd, ""),
			this.ensureTextFile(this.paths.personalityMd, ""),
		]);
	}

	async exists(filePath: string): Promise<boolean> {
		try {
			await access(filePath, constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	async readText(filePath: string): Promise<string> {
		return await readFile(filePath, "utf8");
	}

	async writeText(filePath: string, content: string): Promise<void> {
		await writeFile(filePath, content, "utf8");
	}

	async appendText(filePath: string, content: string): Promise<void> {
		await appendFile(filePath, content, "utf8");
	}

	async readJson<T extends JsonObject = JsonObject>(
		filePath: string,
	): Promise<T> {
		const raw = await readFile(filePath, "utf8");
		if (raw.trim() === "") return {} as T;
		return JSON.parse(raw) as T;
	}

	async writeJson(filePath: string, data: JsonObject): Promise<void> {
		const raw = `${JSON.stringify(data, null, 2)}\n`;
		await writeFile(filePath, raw, "utf8");
	}

	private async ensureTextFile(
		filePath: string,
		defaultContent: string,
	): Promise<void> {
		if (await this.exists(filePath)) return;
		await this.writeText(filePath, defaultContent);
	}

	private async ensureJsonFile(
		filePath: string,
		defaultObject: JsonObject,
	): Promise<void> {
		if (await this.exists(filePath)) return;
		await this.writeJson(filePath, defaultObject);
	}
}
