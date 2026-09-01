"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { routeSemanticEdit } = require("../lib/semantic-edit-router");

const cases = [
  ["整体还行，就是这个转折有点生硬。", { scope: "CROSS_SECTION", changeMagnitude: "MEDIUM", targets: ["转折及前后段"], preserve: ["facts", "conclusion"], allowedChanges: ["transition", "wording"], needsEvidence: false, needsResearch: false }],
  ["前后接得有点突兀，帮我顺一下。", { scope: "CROSS_SECTION", changeMagnitude: "MEDIUM", targets: ["转折及前后段"], preserve: ["facts", "conclusion"], allowedChanges: ["transition", "wording"], needsEvidence: false, needsResearch: false }],
  ["结尾这句话太像提问模板了，换自然一点。", { scope: "LOCAL", changeMagnitude: "LOW", targets: ["结尾"], preserve: ["facts", "conclusion", "structure"], allowedChanges: ["ending", "cta", "wording"], needsEvidence: false, needsResearch: false }],
  ["最后别硬问观众，收得松一点。", { scope: "LOCAL", changeMagnitude: "LOW", targets: ["结尾"], preserve: ["facts", "conclusion", "structure"], allowedChanges: ["ending", "cta", "wording"], needsEvidence: false, needsResearch: false }],
  ["我也不知道哪里不对，就是不太想讲。", { scope: "GLOBAL", changeMagnitude: "HIGH", targets: ["全文"], preserve: ["facts"], allowedChanges: ["structure", "tone", "wording"], needsEvidence: false, needsResearch: false }],
  ["整篇读着都不像我，想从头调整说法和节奏。", { scope: "GLOBAL", changeMagnitude: "HIGH", targets: ["全文"], preserve: ["facts", "conclusion"], allowedChanges: ["structure", "tone", "wording"], needsEvidence: false, needsResearch: false }],
  ["这里如果能补一个真实案例会更好。", { scope: "LOCAL", changeMagnitude: "MEDIUM", targets: ["当前段落"], preserve: ["facts"], allowedChanges: ["examples", "experience", "evidencePath"], needsEvidence: true, evidenceKind: "PERSONAL", needsResearch: false }],
  ["这段缺个公开数据支撑，帮我找可靠来源。", { scope: "LOCAL", changeMagnitude: "MEDIUM", targets: ["当前段落"], preserve: ["facts"], allowedChanges: ["data", "facts", "examples", "evidencePath"], needsEvidence: true, evidenceKind: "PUBLIC", needsResearch: true }],
  ["核心观点我不认同，整个角度重新想。", { scope: "GLOBAL", changeMagnitude: "HIGH", targets: ["全文观点"], preserve: ["facts"], allowedChanges: ["angle", "structure", "conclusion"], needsEvidence: false, needsResearch: false }],
  ["只把这句话换个说法，其他都不要动。", { scope: "LOCAL", changeMagnitude: "LOW", targets: ["选中句"], preserve: ["facts", "conclusion", "structure", "sectionOrder"], allowedChanges: ["wording"], needsEvidence: false, needsResearch: false }],
];

const expectedByFeedback = new Map(cases);
const fakeLlm = async (messages) => {
  const payload = JSON.parse(messages[1].content);
  const expected = expectedByFeedback.get(payload.userFeedback);
  assert(expected, `未配置测试反馈：${payload.userFeedback}`);
  return { userGoal: payload.userFeedback, problems: ["测试语义问题"], forbiddenChanges: [], ...expected };
};

function comparable(contract) {
  return {
    scope: contract.scope,
    changeMagnitude: contract.changeMagnitude,
    preserve: [...contract.preserve].sort(),
    allowedChanges: [...contract.allowedChanges].sort(),
    needsEvidence: contract.needsEvidence,
    needsResearch: contract.needsResearch,
  };
}

async function main() {
  const results = [];
  for (const [feedback, expected] of cases) {
    const contract = await routeSemanticEdit({ llm: fakeLlm, userFeedback: feedback, currentScript: { hook: "示例", sections: [] } });
    assert.deepStrictEqual(comparable(contract), comparable(expected), feedback);
    results.push({ feedback, scope: contract.scope, changeMagnitude: contract.changeMagnitude, preserve: contract.preserve, allowedChanges: contract.allowedChanges, needsEvidence: contract.needsEvidence, needsResearch: contract.needsResearch });
  }

  assert.deepStrictEqual(comparable(results[0]), comparable(results[1]), "转折反馈的两种说法应得到相近合同");
  assert.deepStrictEqual(comparable(results[2]), comparable(results[3]), "自然结尾反馈的两种说法应得到相近合同");
  assert(!results[8].preserve.includes("conclusion"), "质疑观点时不得锁定 conclusion");

  const source = fs.readFileSync(path.join(__dirname, "../lib/content-editor.js"), "utf8");
  ["applyFeedbackPriority", "怕落伍", "迷信Skill", "至少60%"].forEach((legacy) => assert(!source.includes(legacy), `仍包含旧硬编码：${legacy}`));
  console.log(JSON.stringify({ passed: results.length, paraphrasePairs: 2, results }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
