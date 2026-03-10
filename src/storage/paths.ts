import { homedir } from "node:os";
import path from "node:path";

export const TCLAW_DIRNAME = ".tclaw";

export type TclawPaths = Readonly<{
	baseDir: string;
	configJson: string;
	chatMd: string;
	memoryMd: string;
	skillMd: string;
	skillsDir: string;
	personalityMd: string;
}>;

export function getDefaultBaseDir(): string {
	return path.join(homedir(), TCLAW_DIRNAME);
}

export function getTclawPaths(baseDir: string): TclawPaths {
	return {
		baseDir,
		configJson: path.join(baseDir, "config.json"),
		chatMd: path.join(baseDir, "chat.md"),
		memoryMd: path.join(baseDir, "memory.md"),
		skillMd: path.join(baseDir, "skill.md"),
		skillsDir: path.join(baseDir, "skills"),
		personalityMd: path.join(baseDir, "personality.md"),
	};
}
