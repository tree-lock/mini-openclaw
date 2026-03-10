import type { Storage } from "../storage/storage";

export class PersonalityService {
	constructor(private readonly storage: Storage) {}

	async load(): Promise<string> {
		await this.storage.ensureInitialized();
		return await this.storage.readText(this.storage.paths.personalityMd);
	}
}
