"use strict";

const crypto = require("crypto");
const { assessMechanicalInteraction, assessAudiencePresence, assessSpeakability } = require("./audience-engagement");

const STRATEGY_SYSTEM = `你是“口播爆了么”的内容策略主编。只制定一份后续可直接执行的压缩策略，不写成稿。一次性完成内容结构、Hook、自然互动、证据边界、Creator DNA、来源约束、结尾和用户修改要求。事实只能来自用户素材、已确认方向和必要参考信息；参考来源的独特措辞、身份、经历和结论不能变成用户事实。只返回 JSON：{"contentGoal":"","targetAudience":"","coreAngle":"","coreClaim":"","hookStrategy":"","structure":[],"interactionStrategy":[],"tone":"","evidence":[],"mustKeep":[],"mustNotClaim":[],"sourceConstraints":[],"creatorFitRequirements":[],"endingStrategy":"","adjustmentScope":"full|hook|ending|engagement","acceptanceChecks":[]}。`;

const GENERATE_SYSTEM = `你是“口播爆了么”的最终口播写作主编。根据 contentContext 一次生成尽可能接近最终版的完整口播稿。Hook不是正文外的预告，而是完整口播稿真正说出的第一句；说完Hook后不切场，必须能直接顺着说sections[0]。sections[0]只能承接Hook并推进新信息，禁止复述、同义改写或再次解释Hook，label不得写“开场”或“Hook”。必须同时满足：Hook具体有吸引力；Hook到正文有自然因果、转折或时间承接；自然口语、第一次能顺着讲；互动来自信息释放、预期或共同判断，不使用机械问句；每段推进新信息；只使用 evidence，不编造事实、心理、结果、数据或观众经历；不泄漏参考来源及其独特表达；符合目标时长上限；Creator Voice自然但不虚构；结尾自然回到 coreClaim，不强行升华或CTA。若有 previousDraft 和 adjustment，只做要求范围内的必要修改。只返回 JSON：{"titles":["","",""],"hook":"","sections":[{"label":"承接","text":""}],"contentType":"experience|opinion|tutorial|product_tool|other","appliedAudienceMoves":[],"changeSummary":[]}。`;

const JUDGE_SYSTEM = `你是 Unified Content Judge，只判断、不改稿。一次审完 Hook、口语化、互动、证据覆盖、不支持事实、来源泄漏、内容密度、Creator Fit、结论保持和用户修改执行。普通风格建议放 optionalImprovements；只有必须修复才能安全或正确交付的问题放 mustFix。事实矛盾、无证据事实、来源独特表达复刻属于 severeIssues。只返回 JSON：{"passed":true,"score":0,"dimensions":{"hook":{"passed":true,"score":0,"issues":[]},"spokenLanguage":{"passed":true,"score":0,"issues":[]},"interaction":{"passed":true,"score":0,"issues":[]},"evidence":{"passed":true,"score":0,"issues":[]},"unsupportedClaims":{"passed":true,"issues":[]},"sourceLeakage":{"passed":true,"issues":[]},"contentDensity":{"passed":true,"score":0,"issues":[]},"creatorFit":{"passed":true,"score":0,"issues":[]},"conclusion":{"passed":true,"issues":[]}},"mustFix":[],"optionalImprovements":[],"severeIssues":[]}。`;

const FIX_SYSTEM = `你是最小修改编辑。只修复 Unified Judge 的 mustFix，不重新创作，不改变已经正确的结构、事实、语气、Creator DNA和唯一结论。不得添加 contentContext.evidence 之外的事实；未被指出的位置尽量逐字保留。只返回 JSON：{"titles":["","",""],"hook":"","sections":[{"label":"","text":""}],"contentType":"","appliedAudienceMoves":[],"changeSummary":[]}。`;
const CREATOR_LEARNING_RULE = `creatorLearning来自用户过去确认可拍的稿件修改。必须优先遵守其中的长期表达偏好、结构偏好和拒绝模式。acceptedRevisionExamples只用于学习before到after的表达差异；严禁把示例中的事实、经历、观点、数据、主题或专有名词带入当前稿。creatorLearning不是事实来源，与用户本次明确要求冲突时以本次要求为准。`;

function createGenerationContext(requestId, maxCalls = Number(process.env.MAX_LLM_CALLS_PER_GENERATION || 5)) {
  return { requestId: requestId || crypto.randomUUID(), llmCallCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, usageUnavailable: false, maxCalls: Math.max(1, Math.min(5, Number(maxCalls) || 5)), calls: [] };
}

function compactList(values, limit = 20) {
  return [...new Set((Array.isArray(values) ? values : [values]).flat().map((value) => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

function buildStrategyInput(input) {
  return {
    duration: Number(input.duration || 60), adjustment: String(input.adjustment || "").slice(0, 2000), adjustmentScope: input.adjustmentScope || "full",
    currentMaterial: String(input.currentMaterial || "").slice(0, 12000), followUpAnswer: String(input.followUpAnswer || "").slice(0, 4000),
    previousDraft: input.previousDraft || null, confirmedUserConclusion: input.confirmedUserConclusion || input.confirmedStrategy?.confirmedUserConclusion || "",
    confirmedDirection: input.confirmedDirection || null, creator: { identityDNA: input.identityDNA || {}, voiceDNA: input.voiceDNA || {}, preferences: input.creativePreferences || {}, learning: input.creatorLearning || {}, audience: input.audience || "" },
    reference: { title: String(input.referenceMaterial?.title || "").slice(0, 300), excerpt: String(input.referenceMaterial?.text || "").slice(0, 4000), distinctiveFraming: input.sourceDistinctiveFraming || input.confirmedStrategy?.sourceDistinctiveFraming || {} },
  };
}

function buildContentContext(strategy, input) {
  const fallbackEvidence = [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])];
  return {
    strategy,
    evidence: compactList(strategy.evidence?.length ? strategy.evidence : fallbackEvidence, 30),
    mustKeep: compactList(strategy.mustKeep || [input.confirmedUserConclusion], 20), mustNotClaim: compactList(strategy.mustNotClaim, 20),
    creatorVoice: { identityDNA: input.identityDNA || {}, voiceDNA: input.voiceDNA || {}, preferences: input.creativePreferences || {}, learning: input.creatorLearning || {} },
    targetAudience: strategy.targetAudience || input.audience || "", contentGoal: strategy.contentGoal || "",
    coreClaim: strategy.coreClaim || input.confirmedUserConclusion || "", sourceConstraints: compactList(strategy.sourceConstraints, 20), duration: Number(input.duration || 60),
    adjustment: String(input.adjustment || "").slice(0, 2000), adjustmentScope: input.adjustmentScope || "full", previousDraft: input.previousDraft || null,
  };
}

function scriptText(script) { return [script?.titles?.[0], script?.hook, ...(script?.sections || []).map((item) => item.text)].filter(Boolean).join("\n"); }

function openingSimilarity(left = "", right = "") {
  const clean = (value) => String(value).replace(/[\s，。！？、；：,.!?;:]/g, "");
  const a = clean(left); const b = clean(right);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const grams = (value) => new Set([...Array(Math.max(0, value.length - 1))].map((_, index) => value.slice(index, index + 2)));
  const x = grams(a); const y = grams(b);
  const common = [...x].filter((gram) => y.has(gram)).length;
  return common / Math.max(1, Math.min(x.size, y.size));
}

function deterministicValidation(script, contentContext) {
  const text = scriptText(script);
  const duration = Number(contentContext.duration || 60);
  const maxChars = Math.ceil(duration * 4.8);
  const fixedLeakage = [/参考文案/, /原作者/, /原视频/, /这篇爆款/, /参考内容里/, /根据上面的文章/].filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const normalizedLines = text.split(/[。！？\n]+/).map((line) => line.replace(/\s/g, "")).filter((line) => line.length >= 8);
  const repeated = normalizedLines.filter((line, index) => normalizedLines.indexOf(line) !== index);
  const openingOverlap = openingSimilarity(script?.hook, script?.sections?.[0]?.text);
  const required = { titles: Array.isArray(script?.titles) && script.titles.some(Boolean), hook: Boolean(String(script?.hook || "").trim()), sections: Array.isArray(script?.sections) && script.sections.some((item) => String(item.text || "").trim()) };
  return {
    passed: Object.values(required).every(Boolean) && !fixedLeakage.length && repeated.length === 0 && openingOverlap < 0.62,
    required, charCount: text.length, maxChars, durationExceeded: text.length > maxChars, fixedSourceLeakage: fixedLeakage, repeatedLines: [...new Set(repeated)],
    openingOverlap, mechanicalInteraction: assessMechanicalInteraction(script), audiencePresence: assessAudiencePresence(script, script.contentType || "other", duration), speakability: assessSpeakability(script),
  };
}

function normalizeJudge(judge, deterministic) {
  const mustFix = compactList(judge.mustFix, 20);
  if (!deterministic.required.hook) mustFix.push("补齐 Hook");
  if (!deterministic.required.sections) mustFix.push("补齐正文");
  if (deterministic.fixedSourceLeakage.length) mustFix.push(`删除固定来源泄漏表达：${deterministic.fixedSourceLeakage.join("、")}`);
  if (deterministic.repeatedLines.length) mustFix.push("删除明显重复句");
  if (deterministic.openingOverlap >= 0.62) mustFix.push("Hook是完整稿第一句；删除正文的重复开场，让第一段直接承接并推进新信息");
  if (deterministic.durationExceeded) mustFix.push(`压缩到约 ${deterministic.maxChars} 字以内`);
  const severeIssues = compactList(judge.severeIssues, 20);
  const dimensions = judge.dimensions || {};
  if (dimensions.unsupportedClaims?.passed === false || dimensions.evidence?.passed === false) severeIssues.push("evidence_or_unsupported_claims");
  if (dimensions.sourceLeakage?.passed === false) severeIssues.push("high_risk_source_leakage");
  return { ...judge, passed: judge.passed === true && mustFix.length === 0 && deterministic.passed, mustFix: compactList(mustFix, 20), severeIssues: compactList(severeIssues, 20), deterministic };
}

async function runGenerationPipeline({ input, callLLM, generationContext, strategyCache }) {
  const strategyInput = buildStrategyInput(input);
  const strategyKey = crypto.createHash("sha256").update(JSON.stringify(strategyInput)).digest("hex");
  let strategy = strategyCache?.get(strategyKey);
  let strategyCacheHit = Boolean(strategy);
  if (!strategy) {
    strategy = await callLLM({ stage: "strategy", system: `${STRATEGY_SYSTEM}\n${CREATOR_LEARNING_RULE}`, payload: strategyInput, maxTokens: 1800, generationContext });
    strategyCache?.set(strategyKey, strategy);
  }
  const contentContext = buildContentContext(strategy, input);
  let script = await callLLM({ stage: "generate", system: `${GENERATE_SYSTEM}\n${CREATOR_LEARNING_RULE}`, payload: { contentContext }, maxTokens: 2600, generationContext });
  let deterministic = deterministicValidation(script, contentContext);
  let judge = await callLLM({ stage: "judge", system: JUDGE_SYSTEM, payload: { contentContext: { ...contentContext, previousDraft: undefined }, script, deterministic }, maxTokens: 1800, generationContext });
  judge = normalizeJudge(judge, deterministic);
  let fixed = false; let finalJudge = null;
  if (!judge.passed && judge.mustFix.length) {
    script = await callLLM({ stage: "fix", system: FIX_SYSTEM, payload: { contentContext: { ...contentContext, previousDraft: undefined }, script, mustFix: judge.mustFix }, maxTokens: 2400, generationContext });
    fixed = true; deterministic = deterministicValidation(script, contentContext);
    if (judge.severeIssues.length) {
      finalJudge = await callLLM({ stage: "final_judge", system: JUDGE_SYSTEM, payload: { contentContext: { ...contentContext, previousDraft: undefined }, script, deterministic, severeIssuesToVerify: judge.severeIssues }, maxTokens: 1400, generationContext });
      finalJudge = normalizeJudge(finalJudge, deterministic);
    }
  }
  return { script, strategy, contentContext, judge, finalJudge, fixed, deterministic, strategyCacheHit };
}

module.exports = { createGenerationContext, buildStrategyInput, buildContentContext, deterministicValidation, normalizeJudge, runGenerationPipeline, STRATEGY_SYSTEM, GENERATE_SYSTEM, JUDGE_SYSTEM, FIX_SYSTEM };
