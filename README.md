# GetQClawAPIKey

从已登录的本机 QClaw 中提取并打印明文 `apiKey` 的本地 Node CLI。

这个项目现在不再模拟 QClaw 微信扫码登录，也不再调用 QClaw 登录接口。你需要先在官方 QClaw 客户端里完成一次登录/授权；脚本随后读取 QClaw 保存到本机的 provider key。

## Quick Start

```bash
npm install
npm start
```

仅打印 key，不输出 `curl` 示例：

```bash
node main.cjs --key-only
```

## 前置条件

- macOS
- 已安装 QClaw
- 已打开 QClaw 并完成一次登录/授权
- 运行脚本时允许访问 macOS Keychain 中的 `QClaw Safe Storage`

脚本默认读取：

```text
~/Library/Application Support/QClaw/app-store.json
```

也可以通过环境变量覆盖：

```bash
QCLAW_APP_STORE_PATH=/path/to/app-store.json npm start
```

## 原理

QClaw 登录后会把默认 provider 的 key 存在 `app-store.json`：

```text
authGateway.providers.qclaw.apiKey
```

该值通常是 Chromium/Electron `v10` 格式密文。脚本会从 macOS Keychain 读取 `QClaw Safe Storage` / `QClaw Key`，然后解密并打印明文 key。

## API 用法

聊天补全接口地址：

```text
https://mmgrcalltoken.3g.qq.com/aizone/v1/chat/completions
```

示例请求：

```bash
curl --location --request POST 'https://mmgrcalltoken.3g.qq.com/aizone/v1/chat/completions' \
  -H 'Authorization: Bearer <YOUR_API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "modelroute",
    "messages": [
      { "role": "system", "content": "hi" },
      { "role": "user", "content": "hi" }
    ]
  }'
```

注意：该网关虽然兼容 OpenAI `chat/completions` 格式，但只传单条 `user` 消息会返回 `400 invalid request`。示例中保留了一条最小 `system` 消息用于验证。

如果是在 OpenClaw 里配置 provider，`baseUrl` 应填写：

```text
https://mmgrcalltoken.3g.qq.com/aizone/v1
```

不要带 `/chat/completions`；OpenClaw 会自行拼接后续路径。

## 常见问题

### 提示未找到 app-store.json

先安装并打开 QClaw，完成一次登录/授权。

### 提示未找到 authGateway.providers.qclaw.apiKey

说明 QClaw 还没有把默认 provider key 写入本地存储。打开 QClaw，确认登录状态正常，并让客户端完成初始化。

### Keychain 弹出授权提示

允许终端或 Node 访问 `QClaw Safe Storage`，否则无法解密本地密文。
