import { toErrorMessage } from "../utils/errorMessage";
import type { RunCommandOptions, RunCommandResult } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 4096;
const TRUNCATE_SUFFIX = "\n... (output truncated)";

const BLACKLIST_PATTERNS = [
	/\bsudo\b/i,
	/\brm\s+-rf\b/i,
	/\brm\s+-\s*rf\b/i,
	/\bmkfs\b/i,
	/>\s*\/dev\/sd/i,
	/>\s*\/dev\/nvme/i,
	/\|\s*dd\s+of=/i,
];

function isCommandAllowed(command: string): boolean {
	const trimmed = command.trim();
	for (const pattern of BLACKLIST_PATTERNS) {
		if (pattern.test(trimmed)) return false;
	}
	return true;
}

function utf8Truncate(text: string, maxBytes: number): string {
	let usedBytes = 0;
	let result = "";

	for (const ch of text) {
		const codePoint = ch.codePointAt(0);
		if (codePoint === undefined) continue;

		let bytes = 0;
		if (codePoint <= 0x7f) bytes = 1;
		else if (codePoint <= 0x7ff) bytes = 2;
		else if (codePoint <= 0xffff) bytes = 3;
		else bytes = 4;

		if (usedBytes + bytes > maxBytes) break;
		usedBytes += bytes;
		result += ch;
	}

	if (result === text) return text;
	return `${result}${TRUNCATE_SUFFIX}`;
}

export async function runCommand(
	command: string,
	options: RunCommandOptions = {},
): Promise<RunCommandResult> {
	if (!isCommandAllowed(command)) {
		return {
			stdout: "",
			stderr: "Command rejected by security policy (forbidden pattern).",
			code: null,
		};
	}

	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

	const proc = Bun.spawn(["sh", "-c", command], {
		stdout: "pipe",
		stderr: "pipe",
		env: process.env,
	});

	const timeoutId = setTimeout(() => {
		proc.kill();
	}, timeoutMs);

	try {
		const [stdout, stderr] = await Promise.all([
			proc.stdout.text(),
			proc.stderr.text(),
		]);
		const exitCode = await proc.exited;
		clearTimeout(timeoutId);

		return {
			stdout: stdout.length === 0 ? "" : utf8Truncate(stdout, maxOutputBytes),
			stderr: stderr.length === 0 ? "" : utf8Truncate(stderr, maxOutputBytes),
			code: exitCode,
		};
	} catch (err) {
		clearTimeout(timeoutId);
		proc.kill();
		const msg = toErrorMessage(err);
		return {
			stdout: "",
			stderr: `Execution failed: ${msg}`,
			code: null,
		};
	}
}
