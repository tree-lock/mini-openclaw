import { expect, test } from "bun:test";

import { buildBootstrapSystemMessages } from "../src/chat/chatSession";

test("buildBootstrapSystemMessages injects memory then personality", () => {
	const msgs = buildBootstrapSystemMessages({
		memorySummary: "MEM",
		personalityMd: "PERS",
	});

	expect(msgs.length).toBe(1);
	expect(msgs[0]?.role).toBe("system");
	const content = msgs[0]?.content ?? "";
	expect(content).toContain("## Memory");
	expect(content).toContain("MEM");
	expect(content).toContain("## Personality");
	expect(content).toContain("PERS");
	expect(content.indexOf("MEM")).toBeLessThan(content.indexOf("PERS"));
});

test("buildBootstrapSystemMessages skips empty personality", () => {
	const msgs = buildBootstrapSystemMessages({
		memorySummary: "MEM",
		personalityMd: "   ",
	});
	expect(msgs.length).toBe(1);
	expect(msgs[0]?.content).toContain("MEM");
});

test("buildBootstrapSystemMessages skips empty memory", () => {
	const msgs = buildBootstrapSystemMessages({
		memorySummary: "",
		personalityMd: "PERS",
	});
	expect(msgs.length).toBe(1);
	expect(msgs[0]?.content).toContain("PERS");
});
