export function maskSecret(value: string): string {
	const trimmed = value.trim();
	if (trimmed === "") return "<empty>";

	if (trimmed.length <= 4) return "*".repeat(trimmed.length);
	if (trimmed.length <= 12) {
		const keepStart = 2;
		const keepEnd = 2;
		return `${trimmed.slice(0, keepStart)}${"*".repeat(trimmed.length - keepStart - keepEnd)}${trimmed.slice(-keepEnd)}`;
	}

	const keepStart = 4;
	const keepEnd = 4;
	return `${trimmed.slice(0, keepStart)}...${trimmed.slice(-keepEnd)}`;
}
