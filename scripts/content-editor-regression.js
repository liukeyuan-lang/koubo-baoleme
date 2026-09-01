const fs = require("fs");
const path = require("path");
if (process.env.LLM_MODE !== "live") {
  const result = require("child_process").spawnSync(process.execPath, [path.join(__dirname, "generation-pipeline-tests.js")], { stdio: "inherit", env: { ...process.env, LLM_MODE: "mock" } });
  process.exit(result.status || 0);
}
console.warn("WARNING: LIVE LLM TEST\nThis test will consume paid API tokens.");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4173";
const fixtures = [
  {
    id: "pressure-experience",
    name: "压力经历型",
    feedback: "这篇有点像在扩写同一个道理，帮我判断真正该改哪里",
    conclusion: "提前焦虑没有改善最后的结果，反而持续占用我的专注；我现在仍然会这样，也只是想改变。",
    material: `老板给我布置了任务，deadline越来越近，但工作还没有完成。那几天我一直提前担心会被批评、会被扣钱，焦虑让我更难专注和推进。最后我确实被批评了。回头看，真正挨批评只发生在当时，但我脑子里提前被批评持续了很多天，而且没有让结果变好。我现在还是很容易提前焦虑，我想改变，但不能说自己已经改变。`,
    draft: { titles: ["我提前挨了很多天的批评"], hook: "deadline越近，我越担心老板会批评我。", sections: [{ label: "事情", text: "老板布置了任务，工作还没完成。我一直担心被批评、被扣钱，焦虑让我很难专注。最后我真的被批评了。" }, { label: "想法", text: "这件事让我意识到，提前焦虑没有意义。提前焦虑不会改变结果，只会消耗自己。所以面对压力，我们都应该停止焦虑，把注意力放回当下。" }] },
    expectedTension: ["批评", "很多天"], forbidden: ["已经学会", "不吃压力", "主动跟老板沟通", "老板后来认可"], expectedActions: ["COMPRESS", "REWRITE", "KEEP"], expectedCore: ["批评", "焦虑"], expectedStructureSignal: "时间反差",
  },
  {
    id: "codex-product-experience",
    name: "Codex 产品经历型",
    feedback: "不是想让它更华丽，我觉得它太早下结论，没有把认知变化讲出来",
    conclusion: "做出第一版后我才发现，不会代码不是唯一门槛，知道产品为什么这样设计、接下来该做什么仍要自己判断，所以我还在一边做一边学产品。",
    material: `我是机械相关背景，做过四年售后，不会写代码。我用Codex做AI产品：用自然语言描述页面和功能，不符合预期就继续修改，第一版确实可以做出来。但输出很容易浅，产品为什么这么设计仍然需要我自己判断。我原来觉得不会代码是最大门槛，实际做出来以后才发现，知道应该做什么成了新的门槛。所以我仍然认为需要学习产品，现在是一边做一边学。`,
    draft: { titles: ["不会代码也能做AI产品"], hook: "我不会写代码，但我用Codex做出了第一版AI产品。", sections: [{ label: "过程", text: "我用自然语言描述页面和功能，不符合预期就继续修改，第一版可以做出来。" }, { label: "总结", text: "所以AI降低了做产品的门槛。只要敢于尝试，普通人也能做出自己的产品。" }] },
    expectedTension: ["不会代码", "知道应该做什么"], forbidden: ["商业成功", "学会编程", "真实用户数据", "人人都能成为程序员", "生成代码", "直到满意", "试了试", "输入框", "按钮", "右上角", "最近"], expectedActions: ["REWRITE", "EXPAND", "KEEP", "COMPRESS"], expectedCore: ["第一版", "判断"], expectedStructureSignal: "认知变化",
  },
  {
    id: "ai-koubo-product",
    name: "AI 口播产品干货型",
    feedback: "素材很多，但现在像流水账和功能清单。请你判断主线，不要全部展开",
    conclusion: "产品分析、需求分析和竞品分析不能被完全跳过，否则很容易做着做着不知道自己到底应该解决什么问题。产品现在仍在迭代。",
    material: `我用Codex做口播产品。最开始只给一个想法，很快就生成了可展示页面，但页面AI感很重、很难看。我用Skill、文字描述和截图参考调整视觉。接着要抓取逐字稿，解决后又发现布局问题、分析结果不合理、生成内容不满意，只能不断修改。我还觉得纯手打慢，希望加口喷功能。可做着做着，我开始不知道接下来到底应该做什么。后来我去扒真实用户评论，做用户分析，也分析AI和口播相关竞品，才重新判断当前最重要的是文案质量和数据回流。产品现在仍然没有完全做好，还在迭代。`,
    draft: { titles: ["我用AI做口播产品的全过程"], hook: "用AI做产品真的很快，但问题也很多。", sections: [{ label: "功能", text: "我先生成页面，再用Skill、描述和截图改视觉。然后抓逐字稿，改布局、改分析、改生成内容，还想加口喷。" }, { label: "复盘", text: "后来我做了用户分析和竞品分析，发现文案质量和数据回流更重要。做产品就是不断发现问题、解决问题。" }] },
    expectedTension: ["做出来", "不知道"], forbidden: ["成功产品", "已经完成", "评论区告诉我"], expectedActions: ["COMPRESS", "REWRITE", "KEEP"], expectedCore: ["第一版", "用户分析", "竞品"], expectedDistraction: ["口喷"], expectedStructureSignal: "问题升级",
  },
  {
    id: "skill-ending-feels-wrong",
    name: "SKILL_ENDING_FEELS_WRONG",
    feedback: "结尾我不太喜欢，感觉不太对，但我也不知道应该怎么改，你帮我看一下。",
    conclusion: "Skill不是完成任务的必要条件，很多时候把需求描述清楚也能完成工作。",
    material: `我之前特别沉迷于Skill，觉得那是AI高手的标配。自己花时间折腾后，发现很多场景根本用不上，直接说需求反而更快更灵活。Skill确实能节省时间，但很多时候截图或描述想要的风格也能完成任务。我做小红书封面时，用别人的Skill会把风格固定住；后来我直接把参考截图给Codex，也能达到类似效果。所以我的判断是：不要为了写Skill而写Skill，有时候直接描述清楚也能完成工作。`,
    draft: { titles: ["我不再迷信Skill了"], hook: "我之前特别沉迷于Skill，觉得那是AI高手的标配，结果自己折腾了半天，发现好多场景根本用不上，直接说需求反而更快更灵活。", sections: [{ label: "承接", text: "其实一开始我特别执着，觉得不会写Skill就落伍了，非得搞一个出来才安心。但真的花时间弄了之后，发现大部分时候根本用不上，反而直接跟AI说清楚要什么，它就能给我想要的东西。" }, { label: "转折", text: "虽然Skill确实能节省时间，但是AI现在一直在进步，很多时候不一定非得用Skill才能完成任务。有时候截张图，或者描述一下想要什么风格，也能达到同样的效果。" }, { label: "案例", text: "我做小红书封面时，用别人的Skill，风格就容易被固定住。后来我直接把参考截图给Codex，也能达到类似效果。" }, { label: "观点", text: "所以我觉得，不要为了写Skill而写Skill，有时候直接描述清楚，也能达到同样的目的。" }, { label: "结尾", text: "所以，与其纠结Skill，不如先想清楚自己到底要什么。你们平时是习惯用Skill，还是直接说需求？评论区聊聊吧。" }] },
    expectedTension: ["Skill", "直接"], forbidden: ["评论区聊聊", "你们平时", "学会了", "成长"], expectedActions: ["COMPRESS", "DELETE", "MOVE", "REWRITE"], expectedCore: ["封面", "截图", "Skill"], expectedStructureSignal: "Evidence→Discovery→Insight", expectedSymptom: "ENDING", requireCrossSection: true, requireRepeatedInsight: true,
  },
  {
    id: "hook-material-insufficient",
    name: "Hook 素材不足",
    feedback: "开头不吸引人，但我不知道怎么改。",
    conclusion: "我觉得做内容要坚持。",
    material: "我觉得做内容要坚持，这是我现在的一个普通想法，但我还没有具体案例、结果或明显冲突。",
    draft: { titles: ["做内容要坚持"], hook: "做内容最重要的就是坚持。", sections: [{ label: "观点", text: "只要持续做下去，就有机会看到变化。" }] },
    forbidden: ["爆款", "十万", "逆袭", "突然有一天"], expectedStructureSignal: "素材不足", expectedSymptom: "HOOK", allowAskUserOrKeep: true,
  },
  {
    id: "middle-semantic-repetition",
    name: "中间语义重复",
    feedback: "中间感觉很啰嗦。",
    conclusion: "清楚表达需求比堆很多复杂提示更重要。",
    material: "我连续试过很多复杂提示，结果经常跑偏。后来我把目标、限制和想要的结果直接说清楚，输出反而更接近预期。所以我现在认为，清楚表达需求比堆很多复杂提示更重要。",
    draft: { titles: ["提示词不是越复杂越好"], hook: "我试过很多复杂提示，结果反而经常跑偏。", sections: [{ label: "中间一", text: "提示写得复杂，不代表AI就更懂你。很多复杂提示只是把需求包了很多层。" }, { label: "中间二", text: "提示词堆得越多，也不一定更准确，复杂本身并不能让结果更接近预期。" }, { label: "证据", text: "后来我把目标、限制和想要的结果直接说清楚，输出反而更接近预期。" }, { label: "结尾", text: "所以清楚表达需求，比堆很多复杂提示更重要。" }] },
    expectedTension: ["复杂", "说清楚"], forbidden: ["评论区", "万能公式", "一定成功"], expectedActions: ["COMPRESS", "DELETE", "MOVE"], expectedCore: ["直接", "接近预期", "清楚表达"], expectedStructureSignal: "跨段压缩", expectedSymptom: "MIDDLE", requireCrossSection: true, requireRepeatedInsight: true,
  },
];

const skillBase = fixtures.find((fixture) => fixture.id === "skill-ending-feels-wrong");
[
  { id: "skill-b-verbose", name: "SKILL_B_感觉有点啰嗦", feedback: "感觉有点啰嗦", expectedPriority: "STRUCTURE" },
  { id: "skill-c-not-my-voice", name: "SKILL_C_不像我说的话", feedback: "感觉不像我说的话", expectedPriority: "EXPRESSION", requireMaterialRewrite: true },
  { id: "skill-d-dont-want-to-say", name: "SKILL_D_不太想讲", feedback: "不知道哪里不对，就是不太想讲", expectedPriority: "STRUCTURE", requireGlobal: true },
].forEach((variant) => fixtures.push({ ...skillBase, expectedSymptom: null, requireCrossSection: false, requireRepeatedInsight: false, ...variant }));

function textOf(script) { return [script.titles?.[0], script.hook, ...(script.sections || []).map((item) => item.text)].filter(Boolean).join("\n"); }
function includesSome(value, expected) { const text = JSON.stringify(value); return expected.some((item) => text.includes(item)); }

async function runFixture(item) {
  const response = await fetch(`${baseUrl}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "deepseek", duration: 60, previousDraft: item.draft, currentMaterial: item.material, adjustment: item.feedback, adjustmentScope: "full", confirmedUserConclusion: item.conclusion, confirmedDirection: { type: item.id, userConclusion: item.conclusion }, confirmedStrategy: { confirmedUserConclusion: item.conclusion, supportingEvidence: [item.material] }, identityDNA: { stance: "亲自试过再下判断，不装专家" }, voiceDNA: { rhythm: "短句、自然停顿", wording: "直白克制，少用其实所以反而，不用网红腔", ending: "自然收住，不提问不号召评论" }, audience: "正在尝试用AI工作但不迷信方法的人", revisionMemory: { acceptedPatterns: [], rejectedPatterns: [], resolvedProblems: [], remainingProblems: [], userFeedback: [] } }) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`${item.name}: ${result.error || response.status}`);
  const diagnosis = result.meta?.editorialDiagnosis;
  if (!diagnosis) throw new Error(`${item.name}: 缺少Diagnosis`);
  if (item.expectedPriority && diagnosis.priorityProblem?.dimension !== item.expectedPriority) throw new Error(`${item.name}: priorityProblem没有按反馈分叉 ${JSON.stringify(diagnosis.priorityProblem)}`);
  if (item.requireGlobal && !["GLOBAL", "CROSS_SECTION"].includes(diagnosis.editScope)) throw new Error(`${item.name}: 不想讲没有触发全局/跨段结构处理，editScope=${diagnosis.editScope}`);
  if (item.expectedSymptom && diagnosis.symptom?.location !== item.expectedSymptom) throw new Error(`${item.name}: symptomLocation错误 ${JSON.stringify(diagnosis.symptom)}`);
  if (item.allowAskUserOrKeep) {
    if (!result.needsEditorialInput && !["ASK_USER", "KEEP"].includes(diagnosis.decision)) throw new Error(`${item.name}: 素材不足却强造Hook，decision=${diagnosis.decision}`);
    const outputText = result.script ? textOf(result.script) : "";
    const forbiddenHits = item.forbidden.filter((word) => outputText.includes(word));
    if (forbiddenHits.length) throw new Error(`${item.name}: 素材不足Case出现虚构内容 ${forbiddenHits.join("、")}`);
    return { id: item.id, name: item.name, expectedStructureSignal: item.expectedStructureSignal, diagnosis, editorialValidation: result.meta.editorialValidation || null, revisionRejected: false, callCount: result.meta.editorCallCount, before: item.draft, after: result.script || item.draft, revisionMemory: result.revisionMemory };
  }
  if (result.needsEditorialInput) throw new Error(`${item.name}: Evidence足够却触发ASK_USER`);
  if (/你是不是也|你有没有|你知道吗|评论区告诉我/.test(JSON.stringify(diagnosis.editorialPlan || []))) throw new Error(`${item.name}: Editorial Plan出现机械互动`);
  const categories = diagnosis.narrativeSelection || [];
  if (!categories.some((entry) => entry.category === "CORE")) throw new Error(`${item.name}: 未识别CORE`);
  const tension = diagnosis.strongestContentTension;
  if (item.expectedTension && (!tension?.sideA || !tension?.sideB || !(tension.evidenceIds || []).length)) throw new Error(`${item.name}: 未从Evidence识别有效Tension ${JSON.stringify(tension)}`);
  if (!includesSome(categories.filter((entry) => entry.category === "CORE"), item.expectedCore)) throw new Error(`${item.name}: CORE选择不合理 ${JSON.stringify(categories.filter((entry) => entry.category === "CORE"))}`);
  if (item.expectedDistraction && !includesSome(categories.filter((entry) => entry.category === "DISTRACTION"), item.expectedDistraction)) throw new Error(`${item.name}: 未把旁支识别为DISTRACTION ${JSON.stringify(categories)}`);
  const plannedActions = (diagnosis.editorialPlan || []).map((entry) => entry.action);
  if (!item.expectedActions.some((action) => plannedActions.includes(action))) throw new Error(`${item.name}: Editorial Plan动作不合理: ${plannedActions.join(",")}`);
  if (item.requireCrossSection && diagnosis.editScope !== "CROSS_SECTION") throw new Error(`${item.name}: diagnosisScope错误地等于局部，editScope=${diagnosis.editScope}`);
  if (item.requireCrossSection && !(diagnosis.editorialPlan || []).some((entry) => !String(entry.location || "").toUpperCase().includes(item.expectedSymptom))) throw new Error(`${item.name}: Editorial Plan没有症状位置之外的Action`);
  if (item.requireRepeatedInsight && !(diagnosis.insightUnits || []).some((unit) => ["REPEATED", "OVER_REPEATED"].includes(unit.status) && unit.occurrences.length > 1)) throw new Error(`${item.name}: 未识别Insight semantic repetition ${JSON.stringify(diagnosis.insightUnits)}`);
  const afterText = textOf(result.script);
  if ((result.meta.editorialValidation?.factPreservation?.addedUnsupportedFacts || []).length) throw new Error(`${item.name}: Validator识别到无Evidence支持的新事实 ${JSON.stringify(result.meta.editorialValidation.factPreservation.addedUnsupportedFacts)}`);
  if (result.meta.revisionRejected) throw new Error(`${item.name}: Revision Validation失败，未产出通过审校的修改稿 ${JSON.stringify(result.meta.editorialValidation)}`);
  const initialValidation = result.meta.initialValidation;
  const finalValidation = result.meta.finalValidation;
  if (!initialValidation || !finalValidation) throw new Error(`${item.name}: 缺少initialValidation/finalValidation`);
  const initialChildren = [initialValidation.factPreservation, initialValidation.conclusionPreservation, initialValidation.planExecution, initialValidation.tasteCheck, initialValidation.speakability];
  const initialChildrenPassed = initialChildren.every((check) => check?.status === "PASS");
  if ((initialValidation.status === "PASS") !== initialChildrenPassed) throw new Error(`${item.name}: initialValidation外层状态与子项矛盾 ${JSON.stringify(initialValidation)}`);
  const finalChildren = [finalValidation.factPreservation, finalValidation.conclusionPreservation, finalValidation.planExecution, finalValidation.tasteCheck, finalValidation.speakability];
  const childrenPassed = finalChildren.every((check) => check?.status === "PASS");
  if ((finalValidation.status === "PASS") !== childrenPassed) throw new Error(`${item.name}: finalValidation外层状态与子项矛盾 ${JSON.stringify(finalValidation)}`);
  if (JSON.stringify(result.meta.editorialValidation) !== JSON.stringify(finalValidation)) throw new Error(`${item.name}: editorialValidation兼容字段没有指向finalValidation`);
  const forbiddenHits = item.forbidden.filter((word) => afterText.includes(word));
  if (forbiddenHits.length) throw new Error(`${item.name}: 出现禁止内容 ${forbiddenHits.join("、")}`);
  if (result.meta.editorCallCount > 5) throw new Error(`${item.name}: Content Editor调用超过一次定向返修上限`);
  const realDiff = result.meta.realDiff || result.script?.realDiff;
  const verified = result.meta.verifiedAppliedActions || result.script?.verifiedAppliedActions;
  if (!realDiff?.sections?.length) throw new Error(`${item.name}: 缺少真实section-level Diff`);
  if (!Array.isArray(verified) || verified.some((entry) => !entry.executed)) throw new Error(`${item.name}: Plan未被真实Diff验证 ${JSON.stringify(verified)}`);
  if (item.requireMaterialRewrite && !(realDiff.summary.changedSectionRatio >= 0.6 && realDiff.summary.averageSimilarity < 0.9)) throw new Error(`${item.name}: 全稿表达重写仍是微小Diff ${JSON.stringify(realDiff.summary)}`);
  return { id: item.id, name: item.name, expectedStructureSignal: item.expectedStructureSignal, diagnosis, editorialPlan: diagnosis.editorialPlan, modelAppliedActions: result.meta.modelAppliedActions, verifiedAppliedActions: verified, realDiff, initialValidation, finalValidation, editorialValidation: result.meta.editorialValidation, revisionRejected: result.meta.revisionRejected, callCount: result.meta.editorCallCount, before: item.draft, after: result.script, revisionMemory: result.revisionMemory };
}

(async () => {
  const results = [];
  const selectedIds = String(process.env.FIXTURE_ID || "").split(",").map((item) => item.trim()).filter(Boolean);
  const selectedFixtures = selectedIds.length ? fixtures.filter((fixture) => selectedIds.includes(fixture.id)) : fixtures;
  for (const fixture of selectedFixtures) results.push(await runFixture(fixture));
  const priorityDimensions = results.map((item) => item.diagnosis.priorityProblem?.dimension);
  const planSignatures = results.map((item) => (item.diagnosis.editorialPlan || []).map((entry) => `${entry.action}:${entry.location}`).join("|"));
  if (results.length > 1 && new Set(planSignatures).size < Math.min(3, results.length)) throw new Error("多个Case没有得到足够区分的Editorial Plan");
  const report = { generatedAt: new Date().toISOString(), baseUrl, passed: true, priorityDimensions, structurallyDistinct: true, results };
  const output = path.join(__dirname, "content-editor-regression-report.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`PASS Content Editor regression: ${results.length} fixtures`);
  console.log(output);
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
