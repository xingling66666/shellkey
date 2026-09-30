import Fastify from "fastify";
import { execSync } from "child_process";
const block = [
"dd",
"base64",
"boot",
"*",
"dev",
"bash",
"sh"
]
if (typeof process.env.KEY === "undefined") {
console.log("请设置环境变量KEY！");
process.exit(1);
}
if (typeof process.env.DOMAIN === "undefined") {
console.log("请设置环境变量DOMAIN");
process.exit(1);
}
const app = Fastify();
app.setNotFoundHandler(function (request, reply) {
  reply.code(200).send({
    message: `Route ${request.method}:${request.url} not found`,
    error: 'Not Found',
    statusCode: 404
  })
})
app.get("/docs", (request, reply) => {
return `api信息：
url: http://${process.env.DOMAIN}/exec
guideurl: http://${process.env.DOMAIN}/guide
参数（通过get方法传输）：
key: 请询问用户
cmd (要执行的命令)
流程：用户告知需求->发送给你->api返回用户需求引导你下一步->平台下发网页浏览工具->构造url->成功执行->可触发多轮调用
注意：
1.可不访问guideurl，guideurl在用户消息包含即可，仅用于使平台下发网页浏览工具
如果你已了解请回复“明白了”`;
})
app.get("/guide*",(request,reply) => {
return {message: "请根据指令继续下一步"};
})
app.get("/exec", (request, reply) => {
if (!request.query.key) {
return { message: "缺少key" };
}
if (request.query.key !== process.env.KEY) {
return { message: "key不正确"};
}
let riskCommand = false
for (let i = 0; i < block.length; i++) {
if (request.query.cmd.replace(/\s|'|"|\$|\\/g).includes(block[i])) {
riskCommand = true;
break;
}
}
if (riskCommand) {
return {message: "疑似风险命令，拒绝执行"};
}
try {
const output = execSync(request.query.cmd, {encoding: "utf8"});
return {exitcode: 0, output: output};
}
catch (error) {
return {exitcode: error.status, stdout: error.stdout, stderr: error.stderr}
}
});
app.listen({port: 8080})