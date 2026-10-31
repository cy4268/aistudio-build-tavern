# 来源与改动

MIT 源码：[qiwu622/build-standalone](https://github.com/qiwu622/build-standalone/tree/ad9e8d6b8f4ef35a9257a6aed353385b1744cd02)，固定提交 ad9e8d6b8f4ef35a9257a6aed353385b1744cd02，0.5.0。

- `transport.js` 原样复用 `extensions/build-standalone-adapter/transport.js`。
- `runtime.js`、`index.js`、`manifest.json` 从该扩展改编：独立名称/设置/UI，末端转换及异常拒绝。
- `attachment.js` 提取 `src/build-attachment-context.mjs` 中 `makeSillyTavernAttachment`：仅将字节计数换为 TextEncoder、错误换为标准 Error、显示名改为固定引擎实际使用的 attachment-1。没有复制浏览器操作代码。
- `direct.js` 是新加的 OpenAI 原生附件转换，不经过原版独立网关。

服务端依赖 Mag1cFall/AIStudio2API v0.2.18 / 9b694a6b7c6439db1767a577994dfcc87a3cf588。`internal/api/openai.go` 支持 file.file_data；`internal/aistudio/assistant.go` 将内联附件上传，并强制命名 attachment-1。生成必须使用 -build 模型。

宿主 API：PromptManager.preparePrompt、openAI.promptManager/setOpenAIMessages/oai_settings、getContext().getTokenCountAsync、GENERATION_STARTED / CHAT_COMPLETION_SETTINGS_READY / APP_READY。均由酒馆提供，不依赖 Tavern Helper。实际 ST 1.14.0 / 088ce0e 已核对；TT 2.4.0 / fff9af0 为源码基线，手机版本和运行待用户设备确认。仅主聊天流程，TT headless/session API 不在本次适配范围。

许可原文保存在 LICENSE。扩展不保存密钥，不修改预设或聊天，不自动重试/换号。正文与附件通过用户选择的后端发送，后端的隐私和签名方式由其部署决定。
