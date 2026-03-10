import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Storage } from "../storage/storage";

export interface SkillMeta {
	name: string;
	description: string;
	body: string;
}

const UTF8_BOM = "\uFEFF";

function parseFrontmatter(raw: string): SkillMeta | null {
	const withoutBom = raw.startsWith(UTF8_BOM) ? raw.slice(UTF8_BOM.length) : raw;
	const trimmed = withoutBom.trimStart();
	if (!trimmed.startsWith("---")) return null;

	const lines = trimmed.split(/\r?\n/);
	if (lines[0].trim() !== "---") return null;

	let endIndex = -1;
	for (let i = 1; i < lines.length; i += 1) {
		if (lines[i].trim() === "---") {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) return null;

	const headerLines = lines.slice(1, endIndex);
	let name = "";
	let description = "";
	for (const line of headerLines) {
		const trimmedLine = line.trimEnd();
		const mName = trimmedLine.match(/^name:\s*(.+)\s*$/i);
		if (mName) {
			name = mName[1].trim();
			continue;
		}
		const mDesc = trimmedLine.match(/^description:\s*(.+)\s*$/i);
		if (mDesc) {
			description = mDesc[1].trim();
		}
	}
	if (!name) return null;

	const bodyLines = lines.slice(endIndex + 1);
	while (bodyLines.length > 0 && bodyLines[0].trim() === "") {
		bodyLines.shift();
	}
	const body = bodyLines.join("\n");

	return { name, description, body };
}

export class SkillService {
	constructor(private readonly storage: Storage) {}

	async loadAllSkills(): Promise<SkillMeta[]> {
		await this.storage.ensureInitialized();
		const dir = this.storage.paths.skillsDir;

		let files: string[] = [];
		try {
			files = await readdir(dir);
		} catch {
			return [];
		}

		const mdFiles = files
			.filter((f) => f.toLowerCase().endsWith(".md"))
			.sort((a, b) => a.localeCompare(b, "en"));
		const skills: SkillMeta[] = [];
		for (const file of mdFiles) {
			const full = path.join(dir, file);
			let raw: string;
			try {
				raw = await readFile(full, "utf8");
			} catch {
				continue;
			}
			const meta = parseFrontmatter(raw);
			if (meta) {
				skills.push(meta);
			}
		}
		return skills;
	}

	buildSkillsPrompt(skills: SkillMeta[]): string {
		if (skills.length === 0) return "";
		const parts: string[] = [];
		parts.push(
			"## Skills\n\n以下技能文档规定了在特定用户请求下你应如何回复。当用户的需求与某个 skill 的名称或描述明显相关时（例如「学猫叫」对应 kitty miao）：\n- 仅按该 skill 文档的说明用文字直接回复，不要调用 run_shell 等工具。\n- 若 skill 明确规定了输出形式（如「仅输出喵呜」），则只输出规定内容，不要执行命令或额外解释。\n只有在用户明确要求执行系统操作（如列文件、查内容）且与 skill 无关时，才使用 run_shell。\n\n",
		);
		for (const skill of skills) {
			parts.push(`### ${skill.name}\n`);
			if (skill.description.trim()) {
				parts.push(`描述：${skill.description.trim()}\n`);
			}
			if (skill.body.trim()) {
				parts.push(`${skill.body.trim()}\n`);
			}
		}
		return parts.join("\n");
	}

	async loadAndBuildPrompt(): Promise<string> {
		const skills = await this.loadAllSkills();
		return this.buildSkillsPrompt(skills);
	}
}

