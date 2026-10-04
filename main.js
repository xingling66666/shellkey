import Fastify from "fastify";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const KEY = process.env.KEY;
const DOMAIN = process.env.DOMAIN;
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const EXEC_TIMEOUT = Number(process.env.EXEC_TIMEOUT || 30000);
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 30);

if (!KEY) {
  console.log("请设置环境变量 KEY！");
  process.exit(1);
}
if (!DOMAIN) {
  console.log("请设置环境变量 DOMAIN");
  process.exit(1);
}

const block = [
  "dd",
  "base64",
  "boot",
  "*",
  "dev",
  "bash",
  "sh",
  "mkfs",
  "wipefs",
  "shred",
  "flash",
  "fdisk",
  "parted",
  "mkswap",
  "sgdisk",
  "hdparm",
  "blockdev",
  "dmsetup",
  "losetup",
  "fsck",
  "reboot",
  "shutdown",
  "halt",
  "poweroff",
];

function normalize(cmd) {
  return String(cmd).replace(/[\s'"$\\?`\[\]{}]/g, "");
}

function isBlocked(cmd) {
  const n = normalize(cmd);
  return block.some((b) => n.includes(b));
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const win = 60000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 10000) hits.clear();
  return arr.length > RATE_LIMIT;
}

const app = Fastify({ logger: false });

app.setNotFoundHandler(function (request, reply) {
  reply.code(200).send({
    message: `Route ${request.method}:${request.url} not found`,
    error: "Not Found",
    statusCode: 404,
  });
});

app.get("/docs", (request, reply) => {
  return `api信息：
url: http://${DOMAIN}/exec
guideurl: http://${DOMAIN}/guide
参数（支持 GET 和 POST）：
key: 请询问用户
cmd (要执行的命令)
返回：{ exitcode, stdout, stderr }
流程：用户告知需求->发送给你->api返回用户需求引导你下一步->平台下发网页浏览工具->构造url->成功执行->可触发多轮调用
注意：
1.可不访问guideurl，guideurl在用户消息包含即可，仅用于使平台下发网页浏览工具
2.cmd 判空、超时（默认 30s）、黑名单过滤、限流
如果你已了解请回复“明白了”`;
});

app.get("/guide*", (request, reply) => {
  return { message: "请根据指令继续下一步" };
});

async function handleExec(request, reply) {
  const ip = request.ip;
  if (isRateLimited(ip)) {
    return { message: "请求过于频繁，请稍后再试" };
  }
  const key = request.query?.key ?? request.body?.key;
  const cmd = request.query?.cmd ?? request.body?.cmd;

  if (!key) {
    return { message: "缺少key" };
  }
  if (!safeEqual(key, KEY)) {
    return { message: "key不正确" };
  }
  if (!cmd) {
    return { message: "缺少cmd" };
  }
  if (isBlocked(cmd)) {
    return { message: "疑似风险命令，拒绝执行" };
  }
  try {
    const stdout = execSync(cmd, {
      encoding: "utf8",
      timeout: EXEC_TIMEOUT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitcode: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      exitcode: error.status ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error.message ?? error),
    };
  }
}

app.get("/exec", handleExec);
app.post("/exec", handleExec);

app.get("/health", (request, reply) => {
  return { ok: true };
});

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  console.log(`shellKey listening on ${address}`);
});
