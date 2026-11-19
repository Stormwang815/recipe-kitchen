# 多 AI 服务与用户 API 配置

日期：2026-11-20。状态：代码完成、本地测试和设置页模板编译通过；云端新版本待部署确认，真实服务调用未验收。

## 用户入口

厨房页、导入页 → 我的 AI 服务 → 设置服务、模型与 API Key。

支持创建多份配置，选择当前服务、编辑、删除与测试连接。当前兼容协议是 HTTPS Chat Completions，采用 Bearer API Key、messages 请求和 choices[0].message.content 响应。

预设 DeepSeek、阿里云百炼、火山方舟，另有自定义入口。预设只是地址便利项，不代表这些服务都已真实联调。用户需按账号地域、业务空间和模型权限填写实际信息。原生 Anthropic Messages、Responses、ASR、视频和图片生成接口不在本次兼容范围。

## 数据与密钥路径

- 配置元数据（名称、地址、模型和 JSON 开关）存本机 ai-profiles-v1。
- 密钥默认仅保留在当前小程序运行内存，结束运行后需重新输入。
- 用户明确开启“在这台设备记住密钥”才写入独立本机存储 ai-device-keys-v1；这不是系统钥匙串，也不是加密保险库。
- 调用时将当前配置和密钥通过小程序云函数调用提交到 kitchen，再由服务端转发到用户指定的服务地址。
- 不把密钥写入云数据库、厨房对象、菜谱草稿或菜谱备份；不在响应和应用日志里打印密钥。云函数运营方仍控制执行环境，不宣称密钥对运营方不可见。
- 删除配置清除对应内存及持久密钥。取消记住密钥立即删除已存本机副本。多份配置互相隔离。
- 未选个人配置时沿用平台默认服务，若管理员未配置则返回 AI_NOT_CONFIGURED；不静默改用其他付费服务。

## 服务端实现

aiText 输入新增可选 aiConfig：{baseUrl,model,apiKey,jsonMode}。新增 aiTest 同样接收 aiConfig，发送极短文本检查兼容响应。两种操作均从可信微信调用上下文校验身份。

Base URL 会补齐 /chat/completions；完整地址不会重复追加。JSON 参数为可选，关闭时仍用提示词要求 JSON 并校验结果。不强制不兼容模型接受 response_format。

自定义地址严格限制 HTTPS、443、公网域名；拒绝 URL 账号、查询参数、片段、IP 字面量和本地域名。服务端解析 A 记录，拒绝非公网 IPv4，连接时固定解析结果并保持原域名 TLS 校验，不跟随重定向。设置 DNS 5 秒、请求总计 45 秒和响应 300KB 上限。当前不支持仅 IPv6 服务或局域网 Ollama 地址。

错误仅返回受控业务消息和状态码，不回传服务商原始响应体、请求头或环境变量。API Key 不属于任何共享厨房成员数据。

## 部署与验收

- kitchen 实际当前超时为 3 秒，需要用户在控制台改为 60 秒（以套餐允许上限为准），才能覆盖 DNS 与请求最长等待。
- 本次34项本地测试通过，新增覆盖密钥持久化开关、删除与切换、地址规范、SSRF 拒绝及网络前校验。
- 新页面 WXML 已通过开发工具编译，截图见 app/artifacts/ai-settings-preview.jpg。
- 新版部署确认任务：confirmation_cloud_fn_deploy_ef41e450-ceeb-46e6-9176-d0565fc28cab。继续时先查旧任务，不重复部署。
- 尚未取得真实用户密钥，未调用收费模型。需要用户在设置页填写自己的服务并确认测试，之后以一条短字幕检查草稿。
- 供应商按服务请求计费，测试前有费用与转发说明；不宣称有 API Key 就具备该供应商全部模型能力。

## 官方地址来源（2026-11-20 查询）

- DeepSeek：https://api-docs.deepseek.com/guides/json_mode/
- 阿里云百炼：https://help.aliyun.com/zh/model-studio/base-url
- 火山方舟：https://docs.volcengine.com/docs/ark/text-generation?lang=en

## 超时配置复查

用户完成设置后，2026-11-20通过cloud_fn_info确认kitchen状态Active、timeout=60。新版代码部署已成功。真实服务调用仍待用户在AI设置中填写密钥并确认测试。
