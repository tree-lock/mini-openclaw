import { expect, test } from "bun:test";

import { buildBootstrapSystemMessages } from "../src/chat/chatSession";

test("buildBootstrapSystemMessages includes memory, personality and skills", () => {
	const messages = buildBootstrapSystemMessages({
		memorySummary: "memory-summary",
		personalityMd: "# Personality\n- friendly",
		skillsPrompt: "## Skills\n\n### kitty miao\n描述：打印猫叫的文字\n",
	});

	expect(messages.length).toBe(1);
	const content = messages[0]?.content ?? "";
	expect(content).toContain("## Memory");
	expect(content).toContain("memory-summary");
	expect(content).toContain("## Personality");
	expect(content).toContain("kitty miao");
	expect(content).toContain("## Skills");
});

