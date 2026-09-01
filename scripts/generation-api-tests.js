"use strict";

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");

const mockPort = 43110 + Math.floor(Math.random() * 100);
const appPort = mockPort + 200;
let upstreamCalls = 0;
const strategy = { contentGoal: "说明真实落差", targetAudience: "AI产品新手", coreAngle: "做出与做好", coreClaim: "做出第一版仍需要产品判断", evidence: ["第一版做出来了，但输出很浅"], mustKeep: ["仍需要产品判断"], mustNotClaim: [], sourceConstraints: [], structure: ["结果", "落差"], interactionStrategy: ["预期反转"], tone: "自然", endingStrategy: "回到判断" };
const script = { titles: ["做出第一版之后"], hook: "第一版做出来以后，我才发现事情没有结束。", contentType: "product_tool", sections: [{ label: "落差", text: "第一版确实做出来了。但输出很浅，产品为什么这样设计，仍然需要我判断。" }] };
const judge = { passed: true, score: 90, dimensions: { hook: { passed: true }, spokenLanguage: { passed: true }, interaction: { passed: true }, evidence: { passed: true }, unsupportedClaims: { passed: true }, sourceLeakage: { passed: true }, contentDensity: { passed: true }, creatorFit: { passed: true }, conclusion: { passed: true } }, mustFix: [], optionalImprovements: [], severeIssues: [] };

function responseFor(system) {
  if (system.includes("内容策略主编")) return strategy;
  if (system.includes("Unified Content Judge")) return judge;
  if (system.includes("最终口播写作主编")) return script;
  if (system.includes("最小修改编辑")) return script;
  return {};
}

const mock = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    upstreamCalls += 1;
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const output = responseFor(payload.messages?.[0]?.content || "");
    setTimeout(() => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } })); }, 40);
  });
});

async function ready(base) {
  for (let i = 0; i < 50; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error("测试服务启动失败");
}

(async () => {
  await new Promise((resolve) => mock.listen(mockPort, "127.0.0.1", resolve));
  const app = spawn(process.execPath, ["server.js"], { cwd: require("path").resolve(__dirname, ".."), env: { ...process.env, PORT: String(appPort), LLM_MODE: "mock", LLM_API_KEY: "mock-key", LLM_MODEL: "deepseek-mock", LLM_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, MAX_LLM_CALLS_PER_GENERATION: "5" }, stdio: ["ignore", "pipe", "pipe"] });
  try {
    const base = `http://127.0.0.1:${appPort}`; await ready(base);
    const payload = { clientRequestId: "same-click", duration: 60, currentMaterial: "第一版做出来了，但输出很浅", confirmedUserConclusion: "做出第一版仍需要产品判断" };
    const request = () => fetch(`${base}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).then((response) => response.json());
    const [first, second] = await Promise.all([request(), request()]);
    assert(first.ok && second.ok, "两次相同提交都应安全返回同一结果");
    assert.strictEqual(upstreamCalls, 3, "重复点击不得启动第二套三阶段流水线");
    assert([first.meta.duplicateRequest, second.meta.duplicateRequest].filter(Boolean).length >= 1, "应标记重复请求");
    assert.strictEqual(first.meta.llmCalls, 3);
    assert.strictEqual(first.meta.totalTokens, 450);
    console.log("PASS generation API mock: idempotency calls=3 tokens=450");
  } finally { app.kill("SIGTERM"); mock.close(); }
})().catch((error) => { console.error(error.stack || error); mock.close(); process.exitCode = 1; });
