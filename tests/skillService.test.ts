import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Storage } from "../src/storage/storage";
import { SkillService } from "../src/skill/skillService";

test("SkillService.loadAllSkills parses frontmatter and body", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-skill-"));
	const storage = new Storage({ baseDir: base });
	const service = new SkillService(storage);

	try {
		await storage.ensureInitialized();
		const skillFile = path.join(storage.paths.skillsDir, "kitty-miao.md");
		await writeFile(
			skillFile,
			`---
name: kitty miao
description: 打印猫叫的文字
---

# 学猫叫

仅输出\`喵呜\`即可
`,
			"utf8",
		);

		const skills = await service.loadAllSkills();
		expect(skills.length).toBe(1);
		expect(skills[0]?.name).toBe("kitty miao");
		expect(skills[0]?.description).toBe("打印猫叫的文字");
		expect(skills[0]?.body).toContain("学猫叫");
		expect(skills[0]?.body).toContain("喵呜");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("SkillService.loadAllSkills returns all skills in alphabetical order", async () => {
	const base = await mkdtemp(path.join(tmpdir(), "mini-openclaw-skill-"));
	const storage = new Storage({ baseDir: base });
	const service = new SkillService(storage);

	try {
		await storage.ensureInitialized();
		await writeFile(
			path.join(storage.paths.skillsDir, "kitty-miao.md"),
			`---
name: kitty miao
description: 打印猫叫
---

仅输出喵呜
`,
			"utf8",
		);
		await writeFile(
			path.join(storage.paths.skillsDir, "dog-miao.md"),
			`---
name: dog miao
description: 打印狗叫
---

仅输出汪汪
`,
			"utf8",
		);

		const skills = await service.loadAllSkills();
		expect(skills.length).toBe(2);
		expect(skills[0]?.name).toBe("dog miao");
		expect(skills[1]?.name).toBe("kitty miao");

		const prompt = service.buildSkillsPrompt(skills);
		expect(prompt).toContain("dog miao");
		expect(prompt).toContain("kitty miao");
		expect(prompt).toContain("汪汪");
		expect(prompt).toContain("喵呜");
	} finally {
		await rm(base, { recursive: true, force: true });
	}
});

test("SkillService.buildSkillsPrompt returns empty string when no skills", () => {
	const storage = new Storage({ baseDir: "/tmp/mini-openclaw-empty" });
	const service = new SkillService(storage);

	const prompt = service.buildSkillsPrompt([]);
	expect(prompt).toBe("");
});

