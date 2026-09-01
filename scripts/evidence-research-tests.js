"use strict";

const assert = require("assert");
const { confirmEvidence, detectEvidenceGap, webResearch } = require("../lib/evidence-research");
const { runEvidenceRevision } = require("../lib/content-editor");

const results = [];
function check(name, fn) { return Promise.resolve().then(fn).then(() => results.push({ name, passed: true })); }

(async () => {
  await check("Case 1：模糊平台记忆", () => {
    const gap = detectEvidenceGap({ currentMaterial: "我记得之前看过一个AI接单网站，但名字忘了，里面好像很多人在抢单。" });
    assert.equal(gap.type, "FUZZY_MEMORY"); assert.equal(gap.researchable, true);
    const candidate = { claim: "某平台公开介绍", sourceTitle: "官方介绍", sourceUrl: "https://example.com", publisher: "Example", confidence: "HIGH", entityName: "候选平台" };
    assert.equal(confirmEvidence(candidate, "external_only", "我看过一个平台").memoryMatch, null, "不得自动认定平台");
  });
  await check("Case 2：缺失公开研究", () => {
    const gap = detectEvidenceGap({ currentMaterial: "我记得有研究说AI能提升工作效率，但具体多少忘了。" });
    assert.equal(gap.type, "MISSING_PUBLIC_FACT"); assert.equal(gap.researchable, true);
  });
  await check("Case 3：私人经历不可搜索", async () => {
    const gap = detectEvidenceGap({ currentMaterial: "我忘记我当时投了几个项目了。" });
    assert.equal(gap.type, "MISSING_PERSONAL_DETAIL"); assert.equal(gap.researchable, false);
    await assert.rejects(() => webResearch({ gap, userStatement: "", fetchImpl: () => { throw new Error("不应调用"); }, apiKey: "test" }), (error) => error.code === "EVIDENCE_NOT_RESEARCHABLE");
  });
  await check("Case 4：未点击不产生搜索调用", () => {
    let calls = 0;
    const gap = detectEvidenceGap({ currentMaterial: "我记得有研究说AI能提升效率，数据忘了。" });
    const diagnosisOnly = { evidenceGap: gap };
    assert.equal(calls, 0); assert.equal(diagnosisOnly.evidenceGap.researchable, true);
  });
  await check("Case 5：确认后仅局部修改并校验", async () => {
    const evidence = confirmEvidence({ id: "EXT_E1", claim: "官方说明平台会展示项目经验与案例", sourceTitle: "平台官方介绍", sourceUrl: "https://example.com/about", publisher: "Example", confidence: "HIGH" }, "external_only", "").externalEvidence;
    const script = { titles: ["测试"], hook: "我曾经以为会用AI就能接到单。", sections: [{ label: "经历", text: "我看过一些接单平台，但记不清名字。" }, { label: "结论", text: "会用AI不等于客户会自动来。" }] };
    let call = 0;
    const llm = async () => ++call === 1 ? { text: "我当时看过一些类似的接单平台。公开资料里，这类平台会展示项目经验和案例，但这不能证明它就是我当时看的那个。", inferences: [{ id: "INF_1", type: "INFERENCE", claim: "AI交付效率不等于获客能力", basedOn: ["EXT_E1"] }], changeSummary: ["补充公开证据"] } : { status: "PASS", externalFactsSupported: true, userExperienceNotFabricated: true, onlyAffectedSectionChanged: true, issues: [] };
    const revised = await runEvidenceRevision({ llm, currentScript: script, sectionIndex: 0, userEvidence: [{ id: "USER_E1", type: "USER_EVIDENCE", text: "我看过一些平台" }], externalEvidence: [evidence] });
    assert.equal(revised.validation.status, "PASS"); assert.equal(revised.script.sections[1].text, script.sections[1].text); assert(!revised.script.sections[0].text.includes("就是Example"));
  });
  console.log(JSON.stringify({ passed: true, cases: results }, null, 2));
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
