"use strict";

const SCOPES = ["LOCAL", "CROSS_SECTION", "GLOBAL"];
const MAGNITUDES = ["LOW", "MEDIUM", "HIGH"];
const FEEDBACK_LEVELS = ["EXPRESSION", "STRUCTURE", "EVIDENCE", "DIRECTION"];

const semanticEditRouterSystem = `你是 Content Editor 的 Semantic Edit Router。你只理解用户这次想改什么，并生成动态 Edit Contract；不诊断稿件，不改稿，不把用户反馈套入固定 Intent。

结合 userFeedback 的完整语义、currentScript 的段落和 selectedContext 判断，不用关键词硬匹配。feedbackLevels可多选：EXPRESSION是说法、口语、语气问题；STRUCTURE是重复、节奏、衔接、信息顺序问题；EVIDENCE是案例真实性、论据强度、事实支撑问题；DIRECTION是用户拒绝观点、主题、内容方向或明确不想讲。单独判断rejectsCurrentDirection：只要用户语义上表示不愿继续讲当前内容、要求换掉当前内容/案例与论证组合、或否定当前观点方向，就必须为true并包含DIRECTION；不能因为同一句还提到“案例太虚”就降级成EVIDENCE。primaryFeedbackLevel取影响最深的一层，优先级DIRECTION>EVIDENCE>STRUCTURE>EXPRESSION。“结果感觉不对”这类模糊反馈不能擅自当作结尾表达问题，应交给全局根因诊断。

rollbackTo决定实际回退层：EXPRESSION→SCRIPT，STRUCTURE→GLOBAL_DIAGNOSIS，EVIDENCE→EVIDENCE_CHECK，DIRECTION→CONTENT_DIRECTION。DIRECTION与EVIDENCE同时出现时以CONTENT_DIRECTION为主，但必须先检查真实素材是否足以重建。diagnosisMode：像“结果感觉不对”这种只表达症状、没有指明原因的反馈用ROOT_CAUSE_DISCOVERY；其余用STANDARD。局部症状不得直接变成局部修改边界。

scope：只影响单句/单段为LOCAL；需要联动相邻或多个明确段落为CROSS_SECTION；用户否定整体讲法、观点方向或要求全文重构才是GLOBAL。changeMagnitude必须反映实际改动：局部换说法是LOW；逻辑、转折、相邻段关系是MEDIUM；方向、主线、整体声音或全文重构是HIGH。

preserve只锁定这次用户没有授权改的内容，可选 facts、conclusion、structure、sectionOrder、tone、length、hook、ending。用户质疑观点/结论时不得保留conclusion；用户要求结构重做时不得保留structure/sectionOrder。allowedChanges必须是本次解决问题真正需要的操作，如wording、tone、transition、ending、cta、sectionOrder、structure、angle、length、hook、facts、examples、data、experience；不得为了“灵活”全部放开。

只有修改需要新增或确认事实、案例、数据、个人经历时needsEvidence=true。evidenceKind区分PERSONAL、PUBLIC、MIXED、NONE；个人亲历案例属于PERSONAL，绝不能靠联网生成或查证，needsResearch必须false。只有公开数据、研究或公开实体事实才可为PUBLIC并needsResearch=true。语气、用词、连接、结构、CTA的纯表达修改不需要Evidence。

动态保持规则：EXPRESSION锁facts、conclusion、contentDirection及结构主体；STRUCTURE锁facts、conclusion但允许重组；EVIDENCE只锁facts，允许换案例与论证路径；DIRECTION只锁facts，允许重做conclusion、contentDirection、angle、strategy和structure。真实事实永远不得篡改或虚构。

只返回JSON：{"userGoal":"","problems":[],"targets":[],"feedbackLevels":["EXPRESSION|STRUCTURE|EVIDENCE|DIRECTION"],"primaryFeedbackLevel":"EXPRESSION|STRUCTURE|EVIDENCE|DIRECTION","rejectsCurrentDirection":false,"rollbackTo":"SCRIPT|GLOBAL_DIAGNOSIS|EVIDENCE_CHECK|CONTENT_DIRECTION","diagnosisMode":"STANDARD|ROOT_CAUSE_DISCOVERY","scope":"LOCAL|CROSS_SECTION|GLOBAL","changeMagnitude":"LOW|MEDIUM|HIGH","preserve":[],"allowedChanges":[],"forbiddenChanges":[],"needsEvidence":false,"evidenceKind":"PERSONAL|PUBLIC|MIXED|NONE","needsResearch":false,"reasoningSummary":""}。`;

function strings(value, limit = 20) { return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit); }

function normalizeEditContract(raw = {}) {
  const scope = SCOPES.includes(raw.scope) ? raw.scope : "LOCAL";
  const changeMagnitude = MAGNITUDES.includes(raw.changeMagnitude) ? raw.changeMagnitude : scope === "GLOBAL" ? "HIGH" : scope === "CROSS_SECTION" ? "MEDIUM" : "LOW";
  let preserve = strings(raw.preserve);
  let allowedChanges = strings(raw.allowedChanges);
  const needsEvidence = raw.needsEvidence === true;
  const feedbackLevels = strings(raw.feedbackLevels).filter((item) => FEEDBACK_LEVELS.includes(item));
  const rejectsCurrentDirection = raw.rejectsCurrentDirection === true;
  if (rejectsCurrentDirection && !feedbackLevels.includes("DIRECTION")) feedbackLevels.push("DIRECTION");
  const primaryFeedbackLevel = rejectsCurrentDirection ? "DIRECTION" : FEEDBACK_LEVELS.includes(raw.primaryFeedbackLevel) ? raw.primaryFeedbackLevel : feedbackLevels[0] || "EXPRESSION";
  if (!feedbackLevels.includes(primaryFeedbackLevel)) feedbackLevels.unshift(primaryFeedbackLevel);
  const defaultRollback = { EXPRESSION: "SCRIPT", STRUCTURE: "GLOBAL_DIAGNOSIS", EVIDENCE: "EVIDENCE_CHECK", DIRECTION: "CONTENT_DIRECTION" }[primaryFeedbackLevel];
  const rollbackTo = rejectsCurrentDirection ? "CONTENT_DIRECTION" : ["SCRIPT", "GLOBAL_DIAGNOSIS", "EVIDENCE_CHECK", "CONTENT_DIRECTION"].includes(raw.rollbackTo) ? raw.rollbackTo : defaultRollback;
  const evidenceKind = ["PERSONAL", "PUBLIC", "MIXED", "NONE"].includes(raw.evidenceKind) ? raw.evidenceKind : needsEvidence ? "PERSONAL" : "NONE";
  if (primaryFeedbackLevel === "DIRECTION") {
    preserve = preserve.filter((item) => item === "facts");
    if (!preserve.includes("facts")) preserve.push("facts");
    allowedChanges = strings([...allowedChanges, "contentDirection", "conclusion", "angle", "strategy", "structure"]);
  } else if (primaryFeedbackLevel === "EVIDENCE") {
    preserve = preserve.filter((item) => item === "facts");
    if (!preserve.includes("facts")) preserve.push("facts");
    allowedChanges = strings([...allowedChanges, "examples", "evidencePath"]);
  }
  return {
    userGoal: String(raw.userGoal || "").trim(), problems: strings(raw.problems), targets: strings(raw.targets), scope, changeMagnitude,
    feedbackLevels, primaryFeedbackLevel, rejectsCurrentDirection, rollbackTo, diagnosisMode: raw.diagnosisMode === "ROOT_CAUSE_DISCOVERY" ? "ROOT_CAUSE_DISCOVERY" : "STANDARD",
    preserve, allowedChanges, forbiddenChanges: strings(raw.forbiddenChanges), needsEvidence, evidenceKind, needsResearch: needsEvidence && ["PUBLIC", "MIXED"].includes(evidenceKind) && raw.needsResearch === true,
    reasoningSummary: String(raw.reasoningSummary || "").trim(),
  };
}

async function routeSemanticEdit({ llm, userFeedback, currentScript, selectedContext = null, revisionMemory = {} }) {
  const raw = await llm([{ role: "system", content: semanticEditRouterSystem }, { role: "user", content: JSON.stringify({ userFeedback: String(userFeedback || ""), currentScript, selectedContext, revisionMemory }) }], 0.01, { timeoutMs: 25000, maxTokens: 1400, provider: "deepseek" });
  return normalizeEditContract(raw);
}

function executionPathForContract(contract = {}) {
  if (contract.primaryFeedbackLevel === "DIRECTION") return ["FEEDBACK_ROUTER", "CONTENT_DIRECTION_REBUILD", "EVIDENCE_CHECK", "STRATEGY_REBUILD", "SCRIPT_REGENERATE"];
  if (contract.primaryFeedbackLevel === "EVIDENCE") return ["FEEDBACK_ROUTER", "EVIDENCE_CHECK", "STRATEGY_REBUILD", "SCRIPT_REGENERATE"];
  if (contract.primaryFeedbackLevel === "STRUCTURE") return ["FEEDBACK_ROUTER", contract.diagnosisMode === "ROOT_CAUSE_DISCOVERY" ? "GLOBAL_ROOT_CAUSE_DIAGNOSIS" : "GLOBAL_DIAGNOSIS", "EDIT_PLAN", "SCRIPT_REWRITE"];
  return ["FEEDBACK_ROUTER", "SCRIPT_DIAGNOSIS", "EDIT_PLAN", "SCRIPT_REWRITE"];
}

module.exports = { FEEDBACK_LEVELS, MAGNITUDES, SCOPES, executionPathForContract, normalizeEditContract, routeSemanticEdit, semanticEditRouterSystem };
