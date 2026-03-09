export interface RunCommandOptions {
	timeoutMs?: number;
	maxOutputBytes?: number;
}

export interface RunCommandResult {
	stdout: string;
	stderr: string;
	code: number | null;
}
