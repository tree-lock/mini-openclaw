import type { Storage } from "../storage/storage";
import { maskSecret } from "../utils/mask";
import type { AppConfig, ConfigKey } from "./schema";

export class ConfigManager {
	constructor(private readonly storage: Storage) {}

	async getConfig(): Promise<AppConfig> {
		await this.storage.ensureInitialized();
		const raw = await this.storage.readJson<Record<string, unknown>>(
			this.storage.paths.configJson,
		);

		const result: AppConfig = {};
		for (const [key, value] of Object.entries(raw)) {
			if (typeof value === "string") {
				result[key] = value;
			}
		}
		return result;
	}

	async set(key: ConfigKey, value: string): Promise<void> {
		const cfg = await this.getConfig();
		cfg[key] = value;
		await this.storage.writeJson(this.storage.paths.configJson, cfg);
	}

	async listEntries(): Promise<
		Array<{ key: string; value: string; masked: string }>
	> {
		const cfg = await this.getConfig();
		const keys = Object.keys(cfg).sort();

		return keys.map((key) => {
			const value = cfg[key] ?? "";
			return {
				key,
				value,
				masked: maskSecret(value),
			};
		});
	}

	getMaskedValue(value: string | undefined): string {
		if (typeof value !== "string") return "<empty>";
		return maskSecret(value);
	}
}
