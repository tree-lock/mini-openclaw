import { expect, test } from "bun:test";

import { OpenAiLlm } from "../src/llm/openaiAdapter";

test("OpenAiLlm constructor accepts baseURL and chatModel", () => {
	const llm = new OpenAiLlm({
		apiKey: "sk-test",
		baseURL: "https://api.example.com/v1",
		chatModel: "gpt-4o",
		summarizeModel: "gpt-4o-mini",
	});
	expect(llm).toBeDefined();
});

test("OpenAiLlm constructor works with only apiKey", () => {
	const llm = new OpenAiLlm({ apiKey: "sk-test" });
	expect(llm).toBeDefined();
});
