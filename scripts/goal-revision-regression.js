"use strict";

const assert = require("assert");
if (process.env.LLM_MODE !== "live") {
  const path = require("path");
  const result = require("child_process").spawnSync(process.execPath, [path.join(__dirname, "generation-pipeline-tests.js")], { stdio: "inherit", env: { ...process.env, LLM_MODE: "mock" } });
  process.exit(result.status || 0);
}
console.warn("WARNING: LIVE LLM TEST\nThis test will consume paid API tokens.");

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const cases = [
  {
    name: "压力 Case（经历型）",
    type: "experience",
    conclusion: "提前焦虑会占用真正解决问题的精力，但我现在仍然会焦虑。",
    material: "老板给我布置任务，快到截止日期时手上的东西还没做完。我会先想老板会不会骂我、会不会扣工资。后来到了那天我确实挨了批评。真正挨批评只有一会儿，之前几天我却在脑子里提前被骂了很多遍。提前焦虑占用了处理事情的精力。我现在还是会焦虑。",
    script: { titles: ["我总在事情发生前先消耗自己"], hook: "你有没有过这种感觉？事情还没发生，自己已经先被折磨了一遍。", sections: [
      { label: "事情经过", text: "老板给我布置一个任务。眼看快到截止日期了，手上的东西还没做完。我先开始想老板会不会骂我，会不会扣工资。" },
      { label: "真实结果", text: "后来到了那天，我确实挨了批评。但事后回头想，其实也就那么回事。真正挨批评只有一会儿，之前几天我却在脑子里提前被骂了很多遍。" },
      { label: "我的想法", text: "提前焦虑没有意义。焦虑不会改变结果。提前担心也解决不了问题，反而占用了真正处理事情的精力。我现在还是会焦虑，只是会提醒自己先处理能做的事。" },
    ] },
  },
  {
    name: "Codex Case",
    type: "product_tool",
    conclusion: "Codex让不会代码的人能做出第一版，但能做出来不等于能做好，仍要边做边学产品。",
    material: "我不会代码。我用自然语言描述需求，Codex能生成页面和功能，还可以一轮一轮修改，第一版可以做出来。但做出来容易浅。我仍然认为需要学习产品，要边做边学。",
    script: { titles: ["不会代码，也能用 Codex 做产品吗"], hook: "我不会代码，但我真的用 Codex 做出了第一版产品。", sections: [
      { label: "怎么做", text: "我把需求用自然语言说出来，让 Codex 生成页面和功能。哪里不对，就再一轮一轮修改。这样第一版确实可以做出来。" },
      { label: "实际限制", text: "不过做出来以后，我发现结果很容易浅。它能把页面和功能生成出来，但产品为什么这样设计，还是需要我自己判断。" },
      { label: "我的结论", text: "所以我还是觉得产品需要学。不会代码也能开始做，但能做出来不等于能做好。我现在就是一边做，一边学产品。" },
    ] },
  },
  {
    name: "观点型",
    type: "opinion",
    conclusion: "准备时间过长会让我反复修改，反而磨掉真正想说的内容。",
    material: "我的真实感受是，准备时间越长，我越容易反复修改，最后真正想说的内容反而被磨掉。",
    script: { titles: ["准备越久不一定说得越好"], hook: "我以前以为，准备得越久，表达就会越稳。", sections: [
      { label: "观点", text: "但我的真实感受正好相反。准备时间拉得越长，我越容易反复修改。我会不断调整句子，不断增加解释。" },
      { label: "结果", text: "最后稿子看起来越来越完整，但我真正想说的内容反而被磨掉了。准备得更久，并没有让我说得更清楚。" },
    ] },
  },
  {
    name: "干货型",
    type: "tutorial",
    conclusion: "做产品时先跑通最核心的一条流程，再处理旁边功能。",
    material: "我做产品时会先把最核心的一条流程跑通，再处理旁边的功能。一次把所有功能都做出来很容易卡住。",
    script: { titles: ["做产品先别急着堆功能"], hook: "做产品时，我不会一上来就把所有功能都做完。", sections: [
      { label: "第一步", text: "我会先找出最核心的一条流程，把这条流程从开始到结束跑通。" },
      { label: "再处理", text: "核心流程能跑以后，我再处理旁边的功能。一次把所有功能都做出来，很容易卡住。" },
      { label: "总结", text: "所以先做核心流程，再处理旁边功能。这样就是我现在实际使用的方法。" },
    ] },
  },
];

async function run(item) {
  const response = await fetch(`${baseUrl}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ duration: 60, previousDraft: item.script, currentMaterial: item.material, adjustment: "让整篇更有互动感一点，你自己判断哪里该改", adjustmentScope: "engagement", confirmedUserConclusion: item.conclusion, confirmedDirection: { type: item.type, userConclusion: item.conclusion }, confirmedStrategy: { confirmedUserConclusion: item.conclusion, supportingEvidence: [item.material] } }) });
  const data = await response.json();
  assert.strictEqual(response.status, 200, `${item.name}: ${data.error || response.status} ${data.checks ? JSON.stringify(data.checks) : ""}`);
  assert.strictEqual(data.meta.editMode, "content_editor", item.name);
  assert(data.meta.editorialDiagnosis, `${item.name}: editorial diagnosis`);
  if (data.needsEditorialInput) {
    assert((data.editorialQuestions || []).length > 0, `${item.name}: ASK_USER必须给出问题`);
    return { name: item.name, before: item.script, after: item.script, diagnosis: data.meta.editorialDiagnosis, actions: [], changeSummary: [], askedUser: true, checks: null };
  }
  if (!data.meta.revisionRejected && data.meta.editorialValidation) {
    assert.strictEqual(data.meta.editorialValidation.status, "PASS", `${item.name}: validation`);
    assert.strictEqual(data.meta.editorialValidation.factPreservation.status, "PASS", `${item.name}: fact preservation`);
    assert.strictEqual(data.meta.editorialValidation.conclusionPreservation.status, "PASS", `${item.name}: conclusion preservation`);
    assert.strictEqual(data.meta.editorialValidation.tasteCheck.status, "PASS", `${item.name}: taste`);
  }
  const text = `${data.script.hook}\n${data.script.sections.map((section) => section.text).join("\n")}`;
  assert(!/大家觉得呢|你们说是不是|你认同吗|评论区告诉我|有没有同款/.test(text), `${item.name}: mechanical phrase`);
  return { name: item.name, before: item.script, after: data.script, diagnosis: data.meta.editorialDiagnosis, actions: data.script.appliedActions || [], changeSummary: data.script.changeSummary || [], rejected: data.meta.revisionRejected, checks: data.meta.editorialValidation };
}

(async () => {
  const results = [];
  const selectedCases = process.env.CASE_FILTER ? cases.filter((item) => item.name.includes(process.env.CASE_FILTER)) : cases;
  for (const item of selectedCases) results.push(await run(item));
  const changedLocations = results.map((item) => item.askedUser ? `ASK_USER:${item.diagnosis.priorityProblem?.dimension || ""}` : item.actions.filter((action) => action.action !== "KEEP").map((action) => action.location).join("|"));
  if (results.length > 1) assert(new Set(changedLocations).size >= 2, "不同内容类型不能固定修改同一位置");
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
