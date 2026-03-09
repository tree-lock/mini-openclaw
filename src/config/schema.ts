export const CONFIG_KEYS = {
	TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
	OPENAI_API_KEY: "OPENAI_API_KEY",
	OPENAI_API_BASE: "OPENAI_API_BASE",
	OPENAI_MODEL_NAME: "OPENAI_MODEL_NAME",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export type AppConfig = Record<string, string>;
