import { expect, test } from "bun:test";

import { maskSecret } from "../src/utils/mask";

test("maskSecret returns <empty> for blank", () => {
	expect(maskSecret("")).toBe("<empty>");
	expect(maskSecret("   ")).toBe("<empty>");
});

test("maskSecret masks short secrets", () => {
	expect(maskSecret("a")).toBe("*");
	expect(maskSecret("ab")).toBe("**");
	expect(maskSecret("abcd")).toBe("****");
});

test("maskSecret preserves ends for medium length", () => {
	expect(maskSecret("abcdefgh")).toBe("ab****gh");
});

test("maskSecret shows prefix and suffix for long secrets", () => {
	expect(maskSecret("sk-1234567890abcdefghijklmnopqrstuvwxyz")).toMatch(
		/^sk-1\.\.\..{4}$/,
	);
});
