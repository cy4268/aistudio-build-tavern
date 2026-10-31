# AI Studio Build · 酒馆分流

供 **SillyTavern（ST）和 TauriTavern（TT）共用**的浏览器侧扩展，连接 [Mag1cFall/AIStudio2API](https://github.com/Mag1cFall/AIStudio2API) 的原生 Build 助手。

启用的预设保留在请求正文中；角色资料、世界书和聊天历史整理成有顺序的文本附件。扩展仅处理 `build-st/` 专用模型，普通模型连接不启用分流，不改写已保存的预设或聊天。

本仓库只提供前端扩展。你需要自行准备可用的 AIStudio2API 服务，或提供相同附件协议与模型名称的兼容网关；扩展不提供账号、Cookie、API 密钥或签名服务。

## 安装

### SillyTavern

在「扩展 → 安装扩展」中输入：

```text
https://github.com/cy4268/aistudio-build-tavern
```

安装后刷新页面，在扩展设置中找到「本地 Build · 酒馆分流」。也可以下载 [ST 安装包](https://github.com/cy4268/aistudio-build-tavern/releases/download/v0.1.0/Local-Build-Tavern-0.1.0-ST.zip)，将其中的 `local-build-tavern` 文件夹放入 `data/<用户>/extensions/`。

### TauriTavern

下载 [TT 数据导入包](https://github.com/cy4268/aistudio-build-tavern/releases/download/v0.1.0/Local-Build-Tavern-0.1.0-TT-import.zip)，**不要解压**，在 TT 的「数据导入」中选择 ZIP，完成后重启应用。

TT 包内目录为 `extensions/third-party/local-build-tavern/`；它与 ST 包使用完全相同的扩展文件，只改变目录结构。GitHub 自动生成的「Source code.zip」不具有这个导入结构，请使用上面的专用包。

如果之前安装过本地版或原版 Build 连接器的分流扩展，请先停用旧分流器并刷新，只保留一套；不要同时从旧文件夹和本仓库加载两个副本。

## 连接设置

1. 选择「聊天补全 → 自定义（兼容 OpenAI）」；TT 使用对应的 OpenAI Chat Completions 自定义连接。
2. 填入你的服务 Base URL（例如 `https://your-api.example/v1`）和自己的 API 密钥。
3. 手动填写模型 `build-st/gemini-3.8-flash-low`。
4. 清空此连接的「自定义请求正文」「排除正文参数」，让扩展为当前请求填写。

| 前端填写 | 实际发送的模型 | 思考档位 |
| --- | --- | --- |
| `build-st/gemini-3.8-flash-low` | `gemini-3.8-flash-build` | low |
| `build-st/gemini-3.8-flash-medium` | `gemini-3.8-flash-build` | medium |
| `build-st/gemini-3.8-flash-high` | `gemini-3.8-flash-build` | high |
| `build-st/gemini-3.8-flash` | `gemini-3.8-flash-build` | high |

`build-st/` 是扩展的本地入口名称，不要求出现在服务器模型列表中。服务端必须提供实际的 `gemini-3.8-flash-build`，并保留 OpenAI 请求中的 `file.file_data` 和 `reasoning_effort`。普通 PG 模型不适用这套 Build 分流。

代码也识别 `build-st/gemini-4-argon` 及同样的三个档位，转为 `gemini-4-argon-build`；该模型尚未做真实生成验收，服务端须另行支持。

首次验证请发送一条普通聊天。「测试连接」不经过预设准备阶段，专用模型可能报告预设未就绪；这不能直接证明后端离线。本版明确拒绝「OpenAI + 反向代理」路径，因为已核对的宿主会丢失该路径下的思考档位。

## 兼容范围与验证

| 组件 | 基线 | 验证情况 |
| --- | --- | --- |
| SillyTavern | 1.14.0 / `088ce0e` | 实际加载与设置面板已确认 |
| TauriTavern | 2.4.0 / `fff9af0` | 主聊天接口已核对源码；手机实机尚未验收 |
| AIStudio2API | v0.2.18 / `9b694a6` | 原生附件生成、兼容网关流式附件生成已通过 |

依赖宿主的 Prompt Manager、聊天补全事件及 token 估算接口，不依赖 Tavern Helper。仅覆盖主聊天流程；TT headless/session API 不在范围内。没有据此承诺其它宿主版本或所有后端都兼容。

## 使用限制

- 支持纯文本、单候选回复；工具、图片和 JSON schema 不属于当前分流模式的支持范围。
- 预设估算上限 45,000 tokens、合成正文上限 1 MiB、背景附件上限 8 MiB。超出时报错，不自动截断。
- 分流不能恢复宿主在更早阶段删掉的历史，也不会扩大实际模型上下文窗口。完整长对话和极限长度未验收。
- 输出长度仅作为提示，Build 助手没有经本扩展验证的硬 token 截断保证。
- Build 助手自带较大的系统上下文，短请求也可能计入约两万输入 tokens；费用与额度按实际后端规则计算。
- 扩展不保存密钥、不读取 Google Cookie、不自行换号或重试；正文与附件通过你选择的后端发送，后端的隐私和签名方式由其部署决定。

停用时切回普通模型，或停用扩展并刷新页面。

## 开发与打包

无需安装 npm 依赖。使用 Node.js 22 或更高版本，运行复用的单条离线回归：

```sh
node test.mjs
```

它检查预设/背景分流、Unicode与顺序、原生附件转换、模型与思考档位、错误拒绝，以及普通连接保持不变。

用 Python 3 标准库生成两种安装包和校验和：

```sh
python package_release.py
```

输出在 `dist/`。打包使用固定文件清单，不包含测试、设置、凭据、角色或聊天数据。

## 来源与许可

本扩展改编自 [qiwu622/build-standalone](https://github.com/qiwu622/build-standalone)，采用 MIT 许可并保留原版权声明。具体复用文件、改动和固定版本见 [UPSTREAM.md](UPSTREAM.md)，许可全文见 [LICENSE](LICENSE)。本项目不代表上述上游项目。
