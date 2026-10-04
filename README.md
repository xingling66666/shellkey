# shellKey

让任何有网页浏览能力的 AI（DeepSeek / Grok / 豆包 / ChatGPT 等）远程操控你的 shell 执行命令。

无需 API Token，只要 AI 能“浏览网页”，就能当 Agent 用。

## 这是什么

一个极简的 HTTP 服务：

```
用户 → 网页 AI（对话）
        │  AI 通过“浏览网页”访问 /docs 学会调 API
        ▼
      shellKey (Fastify)
        │  收到 /exec?key=xxx&cmd=xxx（或 POST）
        ▼
      黑名单 + 归一化过滤 → execSync 执行（带超时）→ 返回结果
        │
        ▼
      AI 读到结果 → 继续下一轮
```

核心思路：把“给人类看的网页文档”变成“给 AI 看的 API 文档”，让 AI 自己学会调你的接口。

## 特性

- 零 Token：用网页版 AI，不需要 API key
- 兼容广：任何有浏览能力的 AI 都能接
- 多轮调用：AI 执行 → 读结果 → 再执行
- 风险兜底：黑名单 + 归一化拦截危险命令
- 加固：命令超时、限流、常量时间密钥比较、POST 支持

## 快速开始

1. 安装依赖

```
npm install
```

2. 设置环境变量

```
export KEY=你的密钥
export DOMAIN=你的域名或IP
# 可选：
export HOST=0.0.0.0        # 监听地址，默认 0.0.0.0
export PORT=8080           # 端口
export EXEC_TIMEOUT=30000  # 单条命令超时（ms）
export RATE_LIMIT=30       # 每 IP 每分钟请求上限
```

3. 启动

```
npm start
```

或直接：`node main.js`。服务默认监听 8080。

## API

### GET /docs

给 AI 看的接口说明。AI 访问后会回复“明白了”，从而触发平台下发网页浏览工具。

### GET /guide*

触发钩子。用户消息里包含 guideurl 时，平台会下发浏览工具。

### GET /exec  与  POST /exec

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| key | 是 | 鉴权密钥 |
| cmd | 是 | 要执行的命令 |

GET 示例：

```
curl "http://127.0.0.1:8080/exec?key=xxx&cmd=ls"
```

POST 示例：

```
curl -X POST http://127.0.0.1:8080/exec \
  -H "Content-Type: application/json" \
  -d '{"key":"xxx","cmd":"ls"}'
```

返回：

```json
{ "exitcode": 0, "stdout": "...", "stderr": "" }
```

### GET /health

健康检查，返回 `{ "ok": true }`。

## 安全模型

分层防御：

1. AI 安全对齐（主防线）：AI 本身不输出危险命令
2. 黑名单 + 归一化：防 AI 被诱导 / 越狱（兜底）
3. KEY：防陌生人乱调
4. 超时 / 限流：防卡死与滥用

黑名单：

```
dd base64 boot * dev bash sh mkfs wipefs shred flash
fdisk parted mkswap sgdisk hdparm blockdev dmsetup losetup
fsck reboot shutdown halt poweroff
```

归一化：执行前删除空白、引号、`$`、反斜杠、`?`、反引号、`[]`、`{}`，防止 `d\d`、`/de?v` 之类绕过。

## 已知限制

- execSync 阻塞，已加 timeout，但长任务仍会占用进程
- 命令走 GET 时会进日志 / 历史，建议优先用 POST
- 黑名单非完备，靠“宁可错杀”策略兜底
- dd 等命令输出可能走 stderr，成功时 stdout 为空属正常
- 内存限流为单实例，多实例 / 重启后失效

## 免责声明

本项目仅用于学习与个人体验。请勿用于未授权的设备。使用者需自行承担因命令执行导致的一切后果。

安全提示：请务必设置强 KEY，避免泄露。KEY 泄露 = 攻击者可远程执行命令。

## License

GPL-3.0-or-later
