const http = require("http");
const { spawn } = require("child_process");

const mockPort = 43881;
const appPort = 43882;
const base = `http://127.0.0.1:${appPort}`;

function fullPayload(material) {
  const parts = material.split(/[。！？]/).filter(Boolean);
  return { contentCore: parts.at(-1) || material, contentType: /步骤|方法/.test(material) ? "tutorial" : /观点/.test(material) ? "opinion" : "experience", contentUnits: {}, storyMaterial: { facts: parts, moments: parts.slice(0, 1), tensions: [], realizations: [], insights: [] }, coreMoment: parts[0] || material, storyValue: {}, evidence: {}, expansionPlan: {}, mechanismFit: "LOW", selectedViralMechanisms: [], rejectedMechanisms: [], finalOutline: [], qualityGates: {}, titles: ["完整逐字稿"], hook: `完整开头：${parts[0] || material}`, sections: [{ label: "正文", text: `这是一篇可以直接照着念的完整正文。${material}` }, { label: "收束", text: `最后回到用户原本的判断：${parts.at(-1) || material}` }], contentSufficiencyCheck: { status: "PASS" }, duplicateFactCheck: { passed: true }, informationProgressionCheck: { passed: true }, selfCheck: {}, explanation: { borrowed: [], usedUserMaterial: parts } };
}

const mock = http.createServer(async (req, res) => {
  let raw = ""; for await (const chunk of req) raw += chunk;
  if (raw.includes("__TIMEOUT__")) return setTimeout(() => res.end(), 3000);
  if (raw.includes("__UPSTREAM_500__")) { res.writeHead(500); return res.end("upstream failed"); }
  if (raw.includes("__INVALID_JSON__")) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ choices: [{ message: { content: "not-json" } }] })); }
  const body = JSON.parse(raw || "{}");
  const system = body.messages?.[0]?.content || "";
  const user = JSON.parse(body.messages?.[1]?.content || "{}") || {};
  let result;
  if (system.includes("素材编辑")) result = { sufficient: true, contentType: "experience", hasMoment: true, question: "", missing: "", missingCriticalInfo: [] };
  else if (system.includes("唯一一次最终返修")) result = { passed: true, issues: [], hook: user.draft?.hook, sections: user.draft?.sections };
  else if (system.includes("自然表达编辑") || system.includes("Speakability 编辑")) result = { titles: ["自然口语版"], hook: "说真的，这件事我一开始也没想明白。", sections: [{ label: "自然开口", text: "先说当时发生了什么。那次遇到问题以后，我没有急着得出结论，而是回到自己真正提供的事实。" }, { label: "过程", text: "我把问题拆开，一步步核对原来的表达。不对的地方继续改，没有证据的内容直接删掉。" }, { label: "收束", text: "最后再回到原本的判断，把这件事清楚、自然地说完。" }] };
  else if (system.includes("提纲编辑")) result = { titles: ["提纲开口版"], hook: "", sections: [{ label: "开头", text: "- 原来的想法\n- 真实经历" }, { label: "第一部分", text: "- 当时发生什么\n- 哪里不对" }, { label: "第二部分", text: "- 后来怎么改\n- 关键转折" }, { label: "结尾", text: "- 最后的发现\n- 用观点收住" }] };
  else result = fullPayload(user.currentMaterial || "测试素材");
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }));
});

async function post(path, payload, timeoutMs = 10000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal }); return { status: response.status, ...(await response.json()) }; }
  finally { clearTimeout(timer); }
}

async function ready() { for (let i = 0; i < 40; i += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("测试服务启动失败"); }

(async () => {
  await new Promise((resolve) => mock.listen(mockPort, "127.0.0.1", resolve));
  const app = spawn(process.execPath, ["server.js"], { cwd: require("path").resolve(__dirname, ".."), env: { ...process.env, PORT: String(appPort), LLM_API_KEY: "test", LLM_MODEL: "mock", LLM_BASE_URL: `http://127.0.0.1:${mockPort}`, LLM_TIMEOUT_SECONDS: "1", GROUNDING_TIMEOUT_SECONDS: "1" }, stdio: ["ignore", "ignore", "pipe"] });
  try {
    await ready();
    const inputs = [
      ["真实经历", "第一次做网站时按钮没反应，后来我补清楚交互，重新运行后成功了。"],
      ["观点", "我的观点是，AI 不能替你判断产品是否真的好用。"],
      ["方法教程", "我的方法有三步：先拆问题，再核对原话，最后删除没有证据的结论。"],
      ["爆款参考", "我只借参考内容的冲突开头，但讲的是自己第一次做网站的经历。"],
      ["无爆款参考", "我想讲普通人怎样把一个模糊想法逐步说清楚。"],
    ];
    const cases = [];
    for (const [name, currentMaterial] of inputs) {
      const full = (await post("/api/generate", { currentMaterial, duration: 60, contentStructure: {}, viralMechanism: {}, transferableDNA: {}, identityDNA: {}, voiceDNA: {} })).script;
      const spoken = (await post("/api/generate-variant", { mode: "spoken", fullScript: full, currentMaterial, creatorDNA: {} })).script;
      const outline = (await post("/api/generate-variant", { mode: "outline", fullScript: full, currentMaterial, creatorDNA: {} })).script;
      cases.push({ name, pass: JSON.stringify(full) !== JSON.stringify(spoken) && JSON.stringify(spoken) !== JSON.stringify(outline), full: full.hook.slice(0, 50), spoken: spoken.hook.slice(0, 50), outline: outline.sections[0].text.slice(0, 50) });
    }
    const failures = [];
    for (const [name, marker, expected] of [["timeout", "__TIMEOUT__", "AI_TIMEOUT"], ["upstream500", "__UPSTREAM_500__", "AI_UPSTREAM_ERROR"], ["invalidResponse", "__INVALID_JSON__", "AI_INVALID_RESPONSE"]]) {
      const started = Date.now(); const result = await post("/api/voice-dna", { sample: marker }); failures.push({ name, pass: result.code === expected, status: result.status, code: result.code, elapsedMs: Date.now() - started });
    }
    const report = { cases, failures, pass: cases.every((item) => item.pass) && failures.every((item) => item.pass) };
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally { app.kill("SIGTERM"); mock.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; mock.close(); });
