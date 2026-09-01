"use strict";

const assert = require("assert");
const { executionPathForContract, normalizeEditContract } = require("../lib/semantic-edit-router");
const { runContentEditor } = require("../lib/content-editor");

const scenarios = {
  A: normalizeEditContract({ userGoal: "结果感觉不对", feedbackLevels: ["STRUCTURE"], primaryFeedbackLevel: "STRUCTURE", rollbackTo: "GLOBAL_DIAGNOSIS", diagnosisMode: "ROOT_CAUSE_DISCOVERY", scope: "GLOBAL", changeMagnitude: "MEDIUM", preserve: ["facts", "conclusion"], allowedChanges: ["structure", "ending"] }),
  B: normalizeEditContract({ userGoal: "删掉啰嗦重复", feedbackLevels: ["STRUCTURE"], primaryFeedbackLevel: "STRUCTURE", rollbackTo: "GLOBAL_DIAGNOSIS", scope: "CROSS_SECTION", changeMagnitude: "MEDIUM", preserve: ["facts", "conclusion"], allowedChanges: ["structure", "length", "sectionOrder"] }),
  C: normalizeEditContract({ userGoal: "改得像本人说话", feedbackLevels: ["EXPRESSION"], primaryFeedbackLevel: "EXPRESSION", rollbackTo: "SCRIPT", scope: "GLOBAL", changeMagnitude: "MEDIUM", preserve: ["facts", "conclusion", "contentDirection", "structure"], allowedChanges: ["wording", "tone"] }),
  D: normalizeEditContract({ userGoal: "拒绝当前方向和虚弱案例", feedbackLevels: ["EVIDENCE", "DIRECTION"], primaryFeedbackLevel: "DIRECTION", rejectsCurrentDirection: true, rollbackTo: "CONTENT_DIRECTION", scope: "GLOBAL", changeMagnitude: "HIGH", preserve: ["facts"], allowedChanges: ["contentDirection", "conclusion", "angle", "strategy", "examples", "structure"], needsEvidence: true, evidenceKind: "PERSONAL" }),
};

async function testDStopsWithoutEvidence() {
  let call = 0;
  const llm = async () => {
    call += 1;
    if (call === 1) return scenarios.D;
    if (call === 2) return { status: "INSUFFICIENT", selectedEvidenceIds: [], rejectedScriptElements: ["Upwork接单案例", "流量才是真正门槛"], reason: "唯一素材就是被用户否定的案例", evidenceGap: { type: "MISSING_PERSONAL_DETAIL", description: "缺少可替换的真实经历", researchable: false, importance: "HIGH" } };
    throw new Error("D路径不应进入Script Rewrite");
  };
  const draft = { titles: ["AI放大能力就能赚钱吗？"], hook: "AI能力变强，不等于能赚钱。", sections: [{ label: "案例", text: "我去Upwork接单，没有客户。" }, { label: "结论", text: "流量才是真正门槛。" }] };
  const result = await runContentEditor({ llm, currentScript: draft, input: { adjustment: "这个东西我不想讲，案例太虚了，没有真实案例支撑，换一个。", currentMaterial: "我注册了Upwork但没有客户。", confirmedUserConclusion: "流量才是真正门槛", revisionMemory: {} } });
  assert.strictEqual(result.needsEditorialInput, true);
  assert.deepStrictEqual(result.script, draft);
  assert(!result.executionPath.includes("SCRIPT_REWRITE"));
  assert(result.executionPath.includes("EVIDENCE_GAP"));
  assert.strictEqual(call, 2, "证据不足时必须在Evidence Check停止");
  return result;
}

async function main() {
  const paths = Object.fromEntries(Object.entries(scenarios).map(([key, contract]) => [key, executionPathForContract(contract)]));
  assert(paths.A.includes("GLOBAL_ROOT_CAUSE_DIAGNOSIS"));
  assert(paths.B.includes("GLOBAL_DIAGNOSIS") && !paths.B.includes("GLOBAL_ROOT_CAUSE_DIAGNOSIS"));
  assert(paths.C.includes("SCRIPT_DIAGNOSIS") && !paths.C.includes("STRATEGY_REBUILD"));
  assert(paths.D.includes("CONTENT_DIRECTION_REBUILD") && paths.D.includes("STRATEGY_REBUILD") && paths.D.includes("SCRIPT_REGENERATE"));
  assert(!scenarios.D.preserve.includes("conclusion") && !scenarios.D.preserve.includes("contentDirection"));
  const d = await testDStopsWithoutEvidence();
  console.log(JSON.stringify({ passed: true, paths, dEvidenceGap: d.editorialDiagnosis.evidenceGap, dPlan: d.editorialDiagnosis.editorialPlan }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
