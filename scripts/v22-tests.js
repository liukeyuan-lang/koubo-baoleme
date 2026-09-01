if (process.env.LLM_MODE !== "live") {
  const path = require("path");
  const result = require("child_process").spawnSync(process.execPath, [path.join(__dirname, "generation-pipeline-tests.js")], { stdio: "inherit", env: { ...process.env, LLM_MODE: "mock" } });
  process.exit(result.status || 0);
}
console.warn("WARNING: LIVE LLM TEST\nThis test will consume paid API tokens.");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const reference = {
  contentStructure: { segments: [{ role: "低门槛结果开场" }, { role: "预告三个步骤" }, { role: "逐项教程" }, { role: "结果证明" }] },
  viralMechanism: { topicMechanism: "降低新人行动门槛", hookMechanism: "低门槛加超预期结果", emotionalTrigger: "从不敢开始到可以做到", valuePromise: "给出能照做的方法", trustMechanism: "真实结果证明", engagementMechanism: "具体步骤带来收藏" },
  transferableDNA: { reusable: ["低门槛加强结果的开头", "用真实结果建立可信度"], conditionallyReusable: ["步骤化表达仅在用户确有步骤时使用"], nonReusable: ["原作者身份", "原作者具体结果"] },
  identityDNA: { identity: "从工业售后转向AI产品的职场人", contentDirection: "AI产品与职业转型", targetAudience: "想转AI的普通职场人", personalStory: "做过工业售后，后来开始做AI产品" },
};
const cases = [
  { id: "A", kind: "事实加具体事件", currentMaterial: "我是机械相关专业，做过四年售后，也不会写代码。最近我让Codex做一个参考爆款生成口播的功能。第一版功能能跑，但我实际一用，发现它只是把我的经历塞进别人的结构，文案很生硬。我让它改成先理解用户真正想讲什么。改完以后不再硬套结构了，但又变成了四段摘要，事情没讲清楚，所以我继续调整。网站最终能运行。这次经历让我发现，整个过程中我做得最多的不是写代码，而是告诉AI我想要什么，再判断它做出来的东西到底对不对。", expectSufficient: true },
  { id: "B", kind: "只有事实没有事件", currentMaterial: "我是机械相关专业，做过四年售后，也不会写代码。我最近用Codex做出了一个网站。", expectSufficient: false },
  { id: "C", kind: "有事件无认知变化", currentMaterial: "我让Codex给网站做PDF导出。第一次按钮做出来了，但点了没有反应。我检查后发现按钮没有调用导出接口，于是让Codex把接口接上。重新运行以后，PDF可以正常下载了。", expectSufficient: true },
  { id: "D", kind: "完整教程", currentMaterial: "我用AI整理访谈记录时会做三步。先把逐字稿按问题切开，再让AI只提取原话里的需求和痛点，最后逐条回到原文核对，删掉没有证据的结论。这样整理出来的内容才能继续做产品判断。", expectSufficient: true },
];
async function post(path, payload) {
  const started = Date.now();
  const controller = new AbortController();
  const timeoutMs = Number(process.env.TEST_TIMEOUT_MS || 60000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
    const data = await response.json().catch(() => ({ ok: false, code: "INVALID_RESPONSE", error: "响应不是有效 JSON" }));
    return { status: response.status, elapsedMs: Date.now() - started, ...data };
  } catch (error) {
    return { status: 0, elapsedMs: Date.now() - started, ok: false, code: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR", error: error.name === "AbortError" ? `用例超过 ${timeoutMs}ms，已停止` : error.message };
  } finally { clearTimeout(timer); }
}
(async () => {
  const output = [];
  const selected = process.env.TEST_CASES ? new Set(process.env.TEST_CASES.split(",")) : null;
  for (const testCase of cases) {
    const { id, kind, currentMaterial, expectSufficient } = testCase;
    if (selected && !selected.has(id)) continue;
    console.error(`[test:v22] Case ${id} completeness started`);
    const completeness = await post("/api/completeness", { ...reference, currentMaterial });
    if (completeness.code === "TIMEOUT" || completeness.status === 0) { output.push({ id, kind, pass: false, status: completeness.status, code: completeness.code, error: completeness.error }); continue; }
    if (!completeness.sufficient) {
      output.push({ id, kind, expectSufficient, sufficient: false, pass: expectSufficient === false, question: completeness.question, missing: completeness.missing, missingCriticalInfo: completeness.missingCriticalInfo, completenessMs: completeness.meta?.durationMs });
      continue;
    }
    console.error(`[test:v22] Case ${id} generation started`);
    const result = await post("/api/generate", { ...reference, voiceDNA: { declaredStyle: "真诚直接" }, currentMaterial, duration: 60 });
    output.push({ id, kind, expectSufficient, sufficient: true, pass: expectSufficient === true && result.status === 200, input: currentMaterial, status: result.status, code: result.code, error: result.error, elapsedMs: result.elapsedMs, modelMs: result.meta?.durationMs, outputChars: result.meta?.outputChars, estimatedSeconds: result.meta?.estimatedSeconds, targetDuration: result.meta?.targetDuration, durationTolerance: result.meta?.durationTolerance, durationFit: result.meta?.durationFit, contentCore: result.meta?.debug?.contentCore, contentType: result.meta?.debug?.contentType, facts: result.meta?.debug?.facts, moments: result.meta?.debug?.moments, tensions: result.meta?.debug?.tensions, realizations: result.meta?.debug?.realizations, insights: result.meta?.debug?.insights, coreMoment: result.meta?.debug?.coreMoment, storyValue: result.meta?.debug?.storyValue, mechanismFit: result.meta?.debug?.mechanismFit, selectedViralMechanisms: result.meta?.debug?.selectedViralMechanisms, finalOutline: result.meta?.debug?.finalOutline, qualityGates: result.meta?.debug?.qualityGates, contentSufficiencyCheck: result.meta?.debug?.contentSufficiencyCheck, groundingCheck: result.meta?.debug?.groundingCheck, hook: result.script?.hook, sections: result.script?.sections });
  }
  if (!selected || selected.has("F")) {
  const voice = await post("/api/voice-dna", { sample: "说真的，我以前也觉得这事离谱。但我真做完以后才发现：别先把自己吓住。你就先做一个最小的，跑起来再说。" });
  const e1 = await post("/api/generate", { ...reference, currentMaterial: cases[0].currentMaterial, duration: 60, voiceDNA: { declaredStyle: "理性专业" } });
  const e2 = await post("/api/generate", { ...reference, currentMaterial: cases[0].currentMaterial, duration: 60, voiceDNA: voice.voiceDNA });
  output.push({ id: "F", input: "Case A同主题；无Voice DNA vs 样本提取Voice DNA", voiceExtractionMs: voice.meta?.durationMs, plainMs: e1.meta?.durationMs, voicedMs: e2.meta?.durationMs, voiceDNA: voice.voiceDNA, plainHook: e1.script?.hook, voicedHook: e2.script?.hook, different: JSON.stringify(e1.script) !== JSON.stringify(e2.script) });
  }
  console.log(JSON.stringify(output, null, 2));
  if (output.some((item) => item.pass === false)) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
