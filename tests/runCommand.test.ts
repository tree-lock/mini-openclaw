import { expect, test } from "bun:test";

import { runCommand } from "../src/command-exec";

test("runCommand returns stdout for simple command", async () => {
	const result = await runCommand("echo hello");
	expect(result.code).toBe(0);
	expect(result.stdout.trim()).toBe("hello");
	expect(result.stderr).toBe("");
});

test("runCommand captures stderr", async () => {
	const result = await runCommand("echo err >&2");
	expect(result.code).toBe(0);
	expect(result.stderr.trim()).toBe("err");
});

test("runCommand rejects blacklisted command (sudo)", async () => {
	const result = await runCommand("sudo ls");
	expect(result.code).toBe(null);
	expect(result.stderr).toInclude("security policy");
});

test("runCommand rejects blacklisted command (rm -rf)", async () => {
	const result = await runCommand("rm -rf /tmp/foo");
	expect(result.code).toBe(null);
	expect(result.stderr).toInclude("security policy");
});

test("runCommand truncates output when over maxOutputBytes", async () => {
	const long = "x".repeat(5000);
	const maxOutputBytes = 100;
	const result = await runCommand(`echo ${long}`, { maxOutputBytes });
	expect(result.code).toBe(0);

	const suffix = "\n... (output truncated)";
	const totalBytes = Buffer.byteLength(result.stdout, "utf8");
	const suffixBytes = Buffer.byteLength(suffix, "utf8");

	expect(totalBytes).toBeLessThanOrEqual(maxOutputBytes + suffixBytes);
	expect(result.stdout).toInclude("truncated");
});

test("runCommand times out and returns without hanging", async () => {
	const result = await runCommand("sleep 5", { timeoutMs: 200 });
	expect(result).toBeDefined();
	expect(typeof result.stdout).toBe("string");
	expect(typeof result.stderr).toBe("string");
});
