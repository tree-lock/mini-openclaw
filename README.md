# mini-openclaw

[openclaw](https://github.com/openclaw/openclaw) 的最小实践：通过 CLI 完成配置与本地对话。  
**P0 范围**：仅 CLI 配置与本地对话；Telegram 真实对话、定时任务与 MCP 的具体实现属后续迭代。

## 命令格式

所有命令形式为：`tclaw <command>`。

## 安装与运行

```bash
bun install
bun run index.ts
```

（或通过 `tclaw` 命令入口调用，视项目实现而定。）

## 命令行功能

### 配置：`tclaw config`

- 运行 `tclaw config` 进入配置，通过单选选择要配置的项。
- 支持配置：
  - **TELEGRAM BOT**：如 `TELEGRAM_BOT_TOKEN`（P0 暂不实现真实 Telegram 对话）。
  - **OPENAI**：如 `OPENAI_API_KEY`，仅支持 OpenAI API 模型。
- 每次交互输入一项配置值。

示例：

```bash
tclaw config
# Choose the configuration you want to configure:
# [1] TELEGRAM BOT
# [2] OPENAI
# Enter the number of the configuration you want to configure:
```

### 查看配置：`tclaw config list`

列出当前所有配置（配置项 key 及脱敏后的值）。

```bash
tclaw config list
```

### 对话：`tclaw chat`

- 运行 `tclaw chat` 进入对话界面，可输入对话内容。
- 对话内命令：
  - `/exit`：退出对话。
  - `/summarize`：总结当前对话内容并保存到日志。
- 退出对话后会自动总结，并写入 `~/.tclaw/memory.md`。
- 再次进入对话时，会读取 `~/.tclaw/chat.md` 展示历史；上下文中仅加载 `~/.tclaw/memory.md` 的记忆摘要，完整历史仍在 chat.md。

## 数据与配置存储（`~/.tclaw`）

首次使用时会自动创建 `~/.tclaw` 及下述文件：

| 路径 | 说明 |
|------|------|
| `~/.tclaw/config.json` | 用户配置（如 TELEGRAM_BOT_TOKEN、OPENAI_API_KEY） |
| `~/.tclaw/chat.md` | 历史对话记录 |
| `~/.tclaw/memory.md` | 对话记忆摘要（每次对话会重新加载） |
| `~/.tclaw/skill.md` | agent 学习的 skill |
| `~/.tclaw/personality.md` | agent 人格定义 |

## 行为（后续迭代）

通过对话可执行的行为将包括（P0 仅列出，具体规范待补充）：

- 设定定时任务
- 调用 MCP

## 技术栈

- [Bun](https://bun.com) 运行时
- TypeScript
- [Biome](https://biomejs.dev/) 代码质量与格式化
