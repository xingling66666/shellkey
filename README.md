# TermuxKey

让**任何有网页浏览能力的 AI**（DeepSeek / Grok / 豆包 / ChatGPT 等）远程操控你的 Termux 执行命令。

无需 API Token，只要 AI 能"浏览网页"，就能当 Agent 用。

---

## 这是什么

一个极简的 HTTP 服务：

```
用户 → 网页 AI（对话）
        │  AI 通过"浏览网页"访问 /docs 学会调 API
        ▼
      TermuxKey (Fastify)
        │  收到 /exec?key=xxx&cmd=xxx
        ▼
      黑名单过滤 → execSync 执行 → 返回结果
        │
        ▼
      AI 读到结果 → 继续下一轮
```

**核心思路**：把"给人类看的网页文档"变成"给 AI 看的 API 文档"，让 AI 自己学会调你的接口。

---

## 特性

- 🆓 **零 Token**：用网页版 AI，不需要 API key
- 🌐 **兼容广**：任何有浏览能力的 AI 都能接
- 🔁 **多轮调用**：AI 执行 → 读结果 → 再执行
- 🛡️ **风险兜底**：黑名单拦截危险命令
- 📱 **面向 Android/Termux**：最坏情况可 fastboot 恢复

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

```bash
export KEY=你的密钥
export DOMAIN=你的域名或IP:端口
```

### 3. 启动

```bash
npm start
```

或直接：

```bash
node main.js
```

服务默认监听 `8080`。

---

## API

### `GET /docs`

给 AI 看的接口说明。AI 访问后会回复"明白了"，从而触发平台下发网页浏览工具。

### `GET /guide*`

触发钩子。用户消息里**包含 `guideurl`** 时，平台会下发浏览工具。

### `GET /exec`

| 参数 | 必填 | 说明 |
|------|:---:|------|
| `key` | ✅ | 鉴权密钥 |
| `cmd` | ✅ | 要执行的命令 |

**示例：**

```
http://your-domain/exec?key=xxx&cmd=ls
```

> ⚠️ URL 含 `&`，curl 测试时**请用双引号**包裹：
> ```bash
> curl "http://127.0.0.1:8080/exec?key=xxx&cmd=ls"
> ```

**返回：**

```json
{ "exitcode": 0, "output": "..." }
```

---

## 安全模型

### 分层防御

| 层 | 作用 |
|------|------|
| 1. AI 安全对齐 | AI 本身不输出危险命令（主防线） |
| 2. 黑名单 | 防 AI 被诱导/越狱（兜底） |
| 3. KEY | 防陌生人乱调 |

### 黑名单

```javascript
const block = [
  "dd",       // 磁盘操作
  "base64",   // 编码执行链
  "boot",     // 引导分区（含 reboot）
  "*",        // 通配符批量操作
  "dev",      // /dev/block 关键分区
  "bash",     // 执行入口
  "sh"        // 执行入口
];
```

### 归一化

执行前对命令做归一化，防止绕过：

```javascript
cmd.replace(/\s|'|"|\$|\\/g, "")
```

- 删空白 → 防空格拆词
- 删引号 → 防 `d''d` → `dd`
- 删 `$` → 防 `$()`、变量
- 删 `\` → 防 `d\d` → `dd`

**归一化后再 `includes` 检查黑名单。**

### 威胁模型

| 环境 | 最坏后果 | 恢复方式 |
|------|------|------|
| Android root | 碰 `/dev/block` 硬砖 | 9008（需授权） |
| Android 非 root | 删用户数据 | 重装 |
| Linux | 重装系统 | 简单 |

**核心目标：拦住"不可逆"的破坏（硬砖），接受"可逆"的（fastboot 刷机可恢复）。**

`dev` 是关键防线——`/dev/block` 下有 `abl`、`xbl`、`modem` 等分区，写坏即变砖。

---

## 已知限制

- `execSync` **阻塞**，建议加 `timeout` 防止卡死
- 命令走 **GET**，会进日志/历史
- 黑名单**非完备**，靠"宁可错杀"策略兜底
- `dd` 等命令输出可能走 **stderr**，成功时 `output` 为空属正常

---

## 建议补充

```javascript
// 执行超时
execSync(cmd, { encoding: "utf8", timeout: 30000 });
```

```javascript
// cmd 判空
if (!request.query.cmd) {
  return { message: "缺少cmd" };
}
```

---

## 免责声明

本项目仅用于**学习与个人体验**。请勿用于未授权的设备。使用者需自行承担因命令执行导致的一切后果。

**安全提示**：请务必设置强 `KEY`，避免泄露。KEY 泄露 = 攻击者可远程执行命令。

---

## License
[GPL-3.0-or-later](./LICENSE)