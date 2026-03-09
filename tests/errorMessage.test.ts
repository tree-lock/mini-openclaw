import { expect, test } from "bun:test";

import { toErrorMessage } from "../src/utils/errorMessage";

test("toErrorMessage returns message for Error instances", () => {
	const err = new Error("boom");
	expect(toErrorMessage(err)).toBe("boom");
});

test("toErrorMessage returns string value as-is", () => {
	expect(toErrorMessage("hello")).toBe("hello");
});

test("toErrorMessage stringifies non-string values", () => {
	expect(toErrorMessage(undefined)).toBe("undefined");
	expect(toErrorMessage(null)).toBe("null");
	expect(toErrorMessage({ a: 1 })).toBe("[object Object]");
});
