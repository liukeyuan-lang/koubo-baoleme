"use strict";

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const mockPort = 43400 + Math.floor(Math.random() * 100);
const appPort = mockPort + 150;
let calls = 0;
const replacementText = "我之前挺喜欢用 Skill，觉得用了会更厉害，但放到实际任务里并不一定。";
const mock = http.createServer((req, res) => {
  req.resume(); req.on("end", () => { calls += 1; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ replacementText }) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } })); });
});

async function ready(base) {
  for (let i = 0; i < 50; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error("测试服务启动失败");
}

(async () => {
  await new Promise((resolve) => mock.listen(mockPort, "127.0.0.1", resolve));
  const app = spawn(process.execPath, ["server.js"], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, PORT: String(appPort), LLM_API_KEY: "mock", LLM_MODEL: "mock", LLM_BASE_URL: `http://127.0.0.1:${mockPort}/v1` }, stdio: "ignore" });
  try {
    const base = `http://127.0.0.1:${appPort}`; await ready(base);
    const response = await fetch(`${base}/api/rewrite-selection`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selectedText: "我之前特别迷写skill，觉得那是AI高手必备技能，结果自己试了才发现，根本不是那么回事。", reason: "not_speakable", userInstruction: "我之前特别喜欢用skill，觉得用了skill就比较牛逼。但实际任务中那就不一定了。", context: {} }) });
    const result = await response.json();
    assert.strictEqual(response.status, 200, JSON.stringify(result));
    assert.strictEqual(result.replacementText, replacementText);
    assert.strictEqual(calls, 1, "自然表达不能误触删除校验或额外重试");
    console.log("PASS selection rewrite: ‘特别喜欢’不会误判为‘别删除’命令");
  } finally { app.kill("SIGTERM"); mock.close(); }
})().catch((error) => { console.error(error.stack || error); mock.close(); process.exitCode = 1; });
