const DIMENSIONS = ["TRUTH", "SUBSTANCE", "INSIGHT", "STRUCTURE", "EXPRESSION", "AUDIENCE"];
const ACTIONS = ["KEEP", "ADD", "DELETE", "REWRITE", "MOVE", "COMPRESS", "EXPAND", "NEED_MORE_EVIDENCE", "ASK_USER", "SHORTEN"];
const CATEGORIES = ["CORE", "SUPPORT", "OPTIONAL", "DISTRACTION"];
const blindDiagnosisCache = new Map();
const { detectEvidenceGap } = require("./evidence-research");
const { executionPathForContract, routeSemanticEdit } = require("./semantic-edit-router");

const diagnosisSystem = `你是“口播爆了么”的 Content Editor，只做诊断和编辑决策，不写成稿。输入被严格分成blindDiagnosisInput与feedbackInputAfterBlindDiagnosis。第一阶段只能读取blindDiagnosisInput，独立完成并锁定六维诊断；第二阶段才能读取反馈，用它选择priorityProblem、rootCause、editScope和Editorial Plan。反馈绝不能改变第一阶段六维结论。用户不需要准确指出哪里该改；你要把模糊反馈翻译成根因，而不是把“互动感不够”直接翻译成加问句，把“像扩写”直接翻译成重写。

按优先级检查六维：P0 TRUTH（事实、主体、结果、成长与用户结论是否越界）；P1 SUBSTANCE（每段是否有新信息，素材能安全支撑多长）；P2 INSIGHT（认知是否由证据推出，是否过早总结或强行升华）；P3 STRUCTURE（主线、信息释放、重复和取舍）；P4 EXPRESSION（口语、文章腔、空洞短视频腔）；P5 AUDIENCE（是否形成自然共同判断，互动是否机械）。高优先级问题不能被低优先级润色掩盖。

先把 Evidence 按叙事价值分为 CORE、SUPPORT、OPTIONAL、DISTRACTION。CORE直接推动本篇唯一结论或关键变化；SUPPORT解释/证明CORE；confirmedUserConclusion中的每个事实边界（例如仍未改变、仍在迭代）至少应归CORE或SUPPORT，不能当作可删的OPTIONAL。OPTIONAL是在同一主线上增加质感、但删除后仍完整的细节；DISTRACTION会引入一个新的功能目标、问题分支或结论，即使它对项目本身重要，在本篇也会把叙事带到另一条主线。不要因为它真实或体现“持续迭代”就降为OPTIONAL；判断它是否与本篇结论存在直接因果/认知推进。比如一篇讲“为什么重新判断产品优先级”的内容里，某个单独的便利功能愿望若既未导致这次判断、也未参与解决核心问题，应归DISTRACTION，而不是因为能体现功能很多就归OPTIONAL。分类只能引用 evidenceId 与简短摘要，不能发明素材。

判断 evidenceSufficiency：ENOUGH=能支撑请求长度且不重复；PARTIAL=只能支撑更短稿；INSUFFICIENT=连可信短稿也不够。Evidence很多不等于全部展开，应SELECT+COMPRESS。寻找 strongestContentTension：只能来自真实Evidence中的时间反差、预期/实际、信念变化、目标/阻力或表象/发现；没有就返回null，禁止强造金句。

结合 currentScript、userFeedback 和 revisionMemory 找 rootCauses。resolvedProblems不要反复修；rejectedPatterns不要再采用；acceptedPatterns可保留。decision只能是 REVISE、ASK_USER、SHORTEN、KEEP。事实不足且补充会实质改变内容才ASK_USER，给1到3个高信息增益问题；已有具体情境、冲突/过程、真实结果和能被证据支持的结论时不得ASK_USER。用户明确说“仍然如此、只是想改变、尚未成功、仍在迭代”是重要事实边界，不是缺少成长结果；不得为了完整故事弧追问改变后的行动或成功。素材只够短稿时SHORTEN。稿件已自然或无法确定时KEEP。

用户指出的局部只叫symptomLocation，是问题被感受到的位置，不得自动等于rootCauseLocation或editScope。即使反馈只说Hook、开头、中间、案例、结尾或某一段，也必须阅读全文做Upstream Root Cause Tracing：先记录用户感觉和symptomLocation，再检查病因是否来自更早或跨段的信息安排，最后确定解决根因所需的最小editScope。最小必要修改指“解决Root Cause所需要的最小修改范围”，不是“尽量只改用户指出的位置”。病因在局部就只改局部；病因跨段就允许跨段COMPRESS、DELETE、MOVE、DELAY CONCLUSION和REWRITE；Evidence不足就ASK_USER；全文太薄就SHORTEN。

必须做Cross-section Diagnosis：找出核心Insight第一次出现的位置和所有语义等价变体，判断Evidence是在Insight之前还是之后、Conclusion是否过早、后续是否只是在证明已经讲完的观点，以及到Ending时是否还剩Evidence支持的realization、consequence、change、unresolved tension或natural closure。Insight重复按Information Unit判断，不按字符串判断；“直接说需求更灵活”“直接告诉AI也可以”“不一定非得用Skill”“不要为了Skill而Skill”可能属于同一个Insight。为每个insightUnit列出统一语义、occurrences和NORMAL|REPEATED|OVER_REPEATED。若Insight在Evidence前已被透支，不得制造新Insight，优先压缩/删除前文重复结论、保留核心Evidence、移动或延迟Conclusion，再重写自然收束。
当insightUnit=OVER_REPEATED时，Editorial Plan不能只做表面措辞压缩；至少一个动作必须真正DELETE或MOVE一处过早Conclusion，或把该段REWRITE成尚未出现的新Evidence。目标是修改后同一Insight只完整落一次，不能仅删除“其实、我觉得、所以”等字词后保留原结论。

Editorial Plan动作支持 KEEP、ADD、DELETE、REWRITE、MOVE、COMPRESS、EXPAND、NEED_MORE_EVIDENCE、ASK_USER、SHORTEN。每个动作必须输出action、target、reason、evidenceSupport、allowed和lockedFacts。EXPAND只能展开当前稿尚未使用、但Evidence里已经明确存在的独立信息单元，evidenceSupport必须列出直接支持该独立细节的Evidence ID；没有则改为NEED_MORE_EVIDENCE且allowed=false。如果Evidence只有过程概述，不能要求Writer补具体案例、操作细节或用户需求。CTA是OPTIONAL，Ending可以直接结束、回到真实变化或核心Evidence、落到Evidence支持的realization、保留未解决状态或自然收住。不得规划新事实、新成长、新结果、新方法、新结论、机械互动、强制CTA、强行金句或统一模板。计划本身也禁止建议“你是不是也/你有没有/你知道吗/你怎么看/评论区聊聊”等互动；Audience问题只能邀请判断稿中已经给出的具体场景。

只返回JSON：{"overallDiagnosis":"","feedbackInterpretation":"","evidenceGap":{"type":"MISSING_PUBLIC_FACT|FUZZY_MEMORY|MISSING_PERSONAL_DETAIL|NONE","description":"","researchable":true,"queryHint":"","affectedSection":"","importance":"HIGH|MEDIUM|LOW"},"symptom":{"location":"HOOK|OPENING|MIDDLE|CASE|ENDING|SECTION|GLOBAL|UNKNOWN","userFeeling":""},"rootCause":{"type":"","locations":[],"reason":""},"editScope":"LOCAL|CROSS_SECTION|GLOBAL|ASK_USER|SHORTEN","crossSectionAnalysis":{"insightFirstAppearsAt":"","evidenceOrder":"BEFORE_INSIGHT|AFTER_INSIGHT|MIXED|NO_EVIDENCE","conclusionTiming":"EARLY|WELL_TIMED|LATE|ABSENT","endingHasNewClosureMaterial":true,"endingClosureBasis":""},"insightUnits":[{"insight":"","occurrences":[],"status":"NORMAL|REPEATED|OVER_REPEATED"}],"dimensions":{"TRUTH":{"status":"PASS|RISK|FAIL","finding":""},"SUBSTANCE":{"status":"RICH|ENOUGH|THIN|INSUFFICIENT","finding":""},"INSIGHT":{"status":"PASS|RISK|FAIL","finding":""},"STRUCTURE":{"status":"PASS|RISK|FAIL","finding":""},"EXPRESSION":{"status":"PASS|RISK|FAIL","finding":""},"AUDIENCE":{"status":"PASS|RISK|FAIL","finding":""}},"rootCauses":[],"priorityProblem":{"dimension":"","problem":"","reason":""},"decision":"REVISE|ASK_USER|SHORTEN|KEEP","narrativeSelection":[],"evidenceSufficiency":{"status":"ENOUGH|PARTIAL|INSUFFICIENT","recommendedDurationSeconds":30,"maxSafeDurationSeconds":45,"reason":"","followUpQuestions":[]},"strongestContentTension":null,"editorialPlan":[],"changeIntentSummary":[]}。Evidence不足时先判断缺口类型；公开可查证才researchable=true，个人经历必须false。没有真实Tension时 strongestContentTension 必须为null。`;

const revisionSystem = `你是口播稿执行编辑。你不是诊断者，不得重新判断问题，只能逐项执行editorialDiagnosis.editorialPlan中allowed=true的非KEEP动作。Edit Contract是本次修改授权边界：preserve中的维度必须保留，只能修改allowedChanges允许的维度，forbiddenChanges不得触碰；changeMagnitude表示解决本次诉求所需的改动强度，不是固定字数或比例。allowed=false和NEED_MORE_EVIDENCE动作不得执行。appliedActions只是调试日志，系统会用真实Diff独立核验，虚报无效。不得漏掉MOVE、DELETE或跨段动作。currentScript是底稿，Evidence是事实边界。当preserve包含conclusion时必须保留confirmedUserConclusion；不包含时可按合同授权调整观点，但仍不得新增无Evidence事实。当editorialDiagnosis存在OVER_REPEATED Insight时，必须实质删除语义重复：只删“其实、我觉得、所以”等修饰词不算COMPRESS或REWRITE；修改后不能在多个段落继续换词说同一结论。计划要求MOVE过早Conclusion时，必须从原位置移除该语义，只在Evidence之后保留一次。

允许KEEP、ADD、DELETE、REWRITE、MOVE、COMPRESS、EXPAND、SHORTEN；ADD/EXPAND只能展开已有Evidence，不能补合理但未提供的细节。每一个具体动词、时间词、技术动作、完成标准和主观意图都必须能直接指向Evidence；不得自行补“最近/后来有一天”等时间背景，不得把“生成页面和功能”扩成更具体的页面类型、控件、按钮、位置、颜色或技术实现，不得把“继续修改”补成修改次数、修改指令或已经改到满意，也不得补“我想试试”等未提供动机。Evidence没有提供具体例子时，禁止自行写“比如/例如”并补例子；宁可保留概述，也不要把概述戏剧化。保留CORE，按计划使用SUPPORT，OPTIONAL只在确有作用时保留，DISTRACTION从本篇删除。不能把“我”做过、发现或判断的内容改成“你”做过、发现或判断。不能把“想改变/仍在迭代”写成已经改变或成功。不得新增CTA、开放式投票、机械问句、强行金句和升华。

不同内容采用由Evidence决定的结构，不默认Hook→经历→转折→三点总结→金句→CTA。严格按symptom、rootCause与editScope执行：症状位置不是修改边界；editScope=CROSS_SECTION时必须执行跨段计划，不能只重写症状段。若Insight在Evidence前被重复透支，优先压缩、删除或移动重复Conclusion，保留并突出核心Evidence，让Evidence→Discovery→Insight只完整落一次。CTA完全可选，计划未明确要求就删除机械CTA并自然收住。互动来自信息释放、预期与实际、让观众判断稿中已经给出的场景；没有必要可以不加问句。Hook若设置信息缺口，正文必须用具体Evidence兑现，禁止“事情没那么简单/真正的挑战还在后面”这类无内容悬念。让过程本身展示认知后，结论只准确落一次，不再把同一Insight解释第二遍。标题、Hook和段落均只在计划要求时修改。输出一篇完整可直接口播的稿。

只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}],"appliedActions":[{"action":"KEEP|ADD|DELETE|REWRITE|MOVE|COMPRESS|EXPAND|SHORTEN","location":"","before":"","after":"","reason":""}],"changeSummary":[]}。`;

const validationSystem = `你是独立的 Content Editor 最终校验员，只审计，不润色。Writer的appliedActions不可信且必须忽略。你只根据 previousScript、candidateScript、Evidence、confirmedUserConclusion、Creator DNA、Edit Contract、Editorial Plan、realDiff和verifiedAppliedActions判定。验收标准必须随Edit Contract动态变化：检查preserve是否保留、allowedChanges是否被正确执行、forbiddenChanges是否被触碰；不得使用统一修改比例，也不得因为LOW改动较小而判失败。

硬检查：
1. FACTS：无新增/删除/改变重要事实、主体、心理、原因、过程、结果、数据或成长。把candidateScript拆成独立事实主张，每条都必须给出支持它的Evidence ID；“例如/比如”后面的具体页面、交互、动作也算事实，不能用常识补；
2. CONCLUSION：仅当Edit Contract.preserve包含conclusion时，把confirmedUserConclusion拆成独立子结论并逐条检查；若未锁定conclusion，则检查其变化是否属于allowedChanges，不得擅自判失败；
3. PLAN：逐项检查allowed=true的计划是否在realDiff中真实发生，并按scope、changeMagnitude、targets判断是否足以解决本次问题，不设统一百分比阈值；
4. TASTE：识别“正确但难看”的问题，包括空洞短视频腔、无回报悬念、网红腔、把Evidence能展示的Insight重新解释一遍、空洞正确、人工情绪、机械互动、硬金句/硬升华、固定模板。Taste是语境判断，不是关键词黑名单；自然出现一个问句或一句总结不自动失败。candidate在Evidence过程之后准确、克制地说一次confirmedUserConclusion，不得仅因它像总结句或明确结论就判FORCED_ELEVATION；只有改成更宏大、更绝对、更口号化，或没有过程承接时才失败。
5. SPEAKABILITY：能第一次顺着说下来。特别审计新增的感受、评价、意图、过程、因果和比较，它们与具体功能事实一样都必须有Evidence。

只有全部通过才PASS。失败时列出具体原句和原因，不生成替代稿。只返回JSON：{"status":"PASS|FAIL","factPreservation":{"status":"PASS|FAIL","claimEvidenceMap":[{"claim":"","evidenceIds":[]}],"addedUnsupportedFacts":[],"removedImportantFacts":[],"changedFacts":[]},"conclusionPreservation":{"status":"PASS|FAIL","clauseCoverage":[{"clause":"","preserved":true,"scriptEvidence":""}],"reason":""},"planExecution":{"status":"PASS|FAIL","missedActions":[],"unplannedChanges":[]},"tasteCheck":{"status":"PASS|FAIL","issues":[{"type":"EMPTY_SHORT_VIDEO|NO_PAYOFF_SUSPENSE|INFLUENCER_TONE|OVER_EXPLAINED_INSIGHT|EMPTY_CORRECTNESS|ARTIFICIAL_EMOTION|MECHANICAL_INTERACTION|FORCED_PUNCHLINE|FORCED_ELEVATION|FIXED_TEMPLATE","text":"","reason":""}]},"speakability":{"status":"PASS|FAIL","reason":""}}。`;

const expansionSemanticsSystem = `Edit Contract.expansionMode是语义路由结果，不是关键词标签。EXPRESSIVE表示表达性展开：在不新增事实的前提下，把Evidence已有的事实、先后关系、对比和用户已说出的判断拆开讲清，增加必要的承接和解释。这不需要“尚未使用的新信息单元”，不得因此改为NEED_MORE_EVIDENCE，也不得原样返回或只增加空话。FACTUAL才表示要增加案例、数据、经历、过程、原因或结果，必须有新Evidence支持。无论哪种展开，都不得编造心理、动机、因果、细节或成绩。`;

const rollbackEvidenceSystem = `你是内容回退链路的 Evidence Check。用户已经否定当前案例、论据或内容方向。只检查提供的真实Evidence中，除被用户否定的案例/论证外，是否存在足以支撑新方向的另一组独立真实素材。Creator Memory只有明确记录的事实可用，风格偏好不是经历。不得用常识、推测、参考稿或原稿中的AI扩写补足。只返回JSON：{"status":"SUFFICIENT|INSUFFICIENT","selectedEvidenceIds":[],"rejectedEvidenceIds":[],"rejectedScriptElements":[],"reason":"","evidenceGap":{"type":"MISSING_PERSONAL_DETAIL|NONE","description":"","researchable":false,"affectedSection":"全稿","importance":"HIGH"},"suggestedDirection":""}。`;

const strategyRebuildSystem = `你是 Content Strategy 重建编辑。当前不是润色旧稿，而是根据Feedback Router的回退决定，使用selectedEvidence重新选择核心观点、切入角度和论证路径。旧稿仅用于识别必须移除的案例与论证，不能当新Evidence。真实事实必须保留且不得改写；旧conclusion和旧contentDirection只有在Edit Contract.preserve明确包含时才能锁定。只返回JSON：{"contentDirection":"","coreClaim":"","angle":"","selectedEvidenceIds":[],"narrativePath":[],"mustRemove":[],"mustKeepFacts":[],"reason":""}。`;

const strategicRegenerateSystem = `你是口播稿重生成编辑。严格按rebuiltStrategy和selectedEvidence从内容策略层重新生成，不是在previousScript上做同义改写。mustRemove中的案例、观点和论证不得残留。只能使用selectedEvidence中的真实事实，不得编造案例、经历、数据、心理、因果或结果。输出完整可口播稿，并如实列出改变。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}],"changeSummary":[]}。`;
const strategicGroundingSystem = `你是策略重建后的事实审计员。逐项检查candidateScript的案例、经历、数据、心理、因果、结果是否由selectedEvidence直接支持，并检查rejectedScriptElements和rebuiltStrategy.mustRemove是否已经消失。不得因文案听起来自然而放过推测。只返回JSON：{"status":"PASS|FAIL","unsupportedClaims":[],"remainingRejectedElements":[],"reason":""}。`;

function scriptText(script = {}) {
  return [script.titles?.[0], script.hook, ...(script.sections || []).map((section) => section.text)].filter(Boolean).join("\n");
}

function compactEvidence(input = {}) {
  const rows = [];
  const seen = new Set();
  const add = (source, value) => {
    const text = String(value || "").trim();
    if (!text) return;
    text.split(/(?<=[。！？；])\s*|\n+/).map((item) => item.trim()).filter(Boolean).forEach((item) => {
      const clipped = item.slice(0, 700);
      if (seen.has(clipped)) return;
      seen.add(clipped);
      rows.push({ id: `E${rows.length + 1}`, type: "USER_EVIDENCE", source, text: clipped });
    });
  };
  add("currentMaterial", input.currentMaterial);
  add("followUpAnswer", input.followUpAnswer);
  (input.confirmedStrategy?.supportingEvidence || []).forEach((item) => add("supportingEvidence", item));
  add("confirmedUserConclusion", input.confirmedUserConclusion);
  (Array.isArray(input.creatorMemory) ? input.creatorMemory : []).forEach((item) => add("creatorMemory", typeof item === "string" ? item : JSON.stringify(item)));
  (input.externalEvidence || []).filter((item) => item?.type === "EXTERNAL_EVIDENCE" && item.userConfirmed === true).forEach((item) => {
    const text = String(item.claim || "").trim();
    if (text) rows.push({ id: String(item.id), type: "EXTERNAL_EVIDENCE", source: item.sourceUrl, text: text.slice(0, 1200), sourceTitle: item.sourceTitle, confidence: item.confidence, userConfirmed: true });
  });
  (input.inferences || []).forEach((item, index) => { const text = String(item.claim || item).trim(); if (text) rows.push({ id: String(item.id || `INF_${index + 1}`), type: "INFERENCE", source: "derived", text: text.slice(0, 1000) }); });
  return rows.slice(0, 40);
}

function normalizeDiagnosis(raw = {}, fallbackDuration = 60) {
  const dimensions = {};
  DIMENSIONS.forEach((name) => {
    const item = raw.dimensions?.[name] || {};
    dimensions[name] = { status: String(item.status || (name === "SUBSTANCE" ? "ENOUGH" : "PASS")), finding: String(item.finding || "") };
  });
  const narrativeSelection = (Array.isArray(raw.narrativeSelection) ? raw.narrativeSelection : []).filter((item) => CATEGORIES.includes(item.category)).slice(0, 40).map((item) => ({ ...item, category: item.category === "OPTIONAL" && item.directlyAdvancesConclusion === false ? "DISTRACTION" : item.introducesSeparateGoal === true && item.directlyAdvancesConclusion !== true ? "DISTRACTION" : item.category }));
  const editorialPlan = (Array.isArray(raw.editorialPlan) ? raw.editorialPlan : []).filter((item) => ACTIONS.includes(item.action)).slice(0, 12);
  const decision = ["REVISE", "ASK_USER", "SHORTEN", "KEEP"].includes(raw.decision) ? raw.decision : "KEEP";
  const sufficiency = raw.evidenceSufficiency || {};
  const symptom = raw.symptom || {};
  const rootCause = raw.rootCause || {};
  let editScope = ["LOCAL", "CROSS_SECTION", "GLOBAL", "ASK_USER", "SHORTEN"].includes(raw.editScope) ? raw.editScope : "LOCAL";
  const insightUnits = (Array.isArray(raw.insightUnits) ? raw.insightUnits : []).slice(0, 12).map((item) => ({ insight: String(item.insight || ""), occurrences: (Array.isArray(item.occurrences) ? item.occurrences : []).map(String).slice(0, 12), status: ["NORMAL", "REPEATED", "OVER_REPEATED"].includes(item.status) ? item.status : "NORMAL" }));
  if (!insightUnits.some((item) => ["REPEATED", "OVER_REPEATED"].includes(item.status)) && /重复|复述|REPET/i.test(`${rootCause.type || ""} ${rootCause.reason || ""}`) && (rootCause.locations || []).length > 1) insightUnits.push({ insight: String(raw.priorityProblem?.problem || rootCause.reason || "跨段重复Insight"), occurrences: rootCause.locations.map(String).slice(0, 12), status: "OVER_REPEATED" });
  if (insightUnits.some((item) => ["REPEATED", "OVER_REPEATED"].includes(item.status) && item.occurrences.length > 1)) editScope = "CROSS_SECTION";
  const diagnosedLocations = new Set([...(Array.isArray(rootCause.locations) ? rootCause.locations : []), ...editorialPlan.filter((item) => item.action !== "KEEP").map((item) => item.location)].map((item) => String(item || "").trim()).filter(Boolean));
  if (diagnosedLocations.size > 1) editScope = "CROSS_SECTION";
  const overRepeated = insightUnits.some((item) => item.status === "OVER_REPEATED" && item.occurrences.length > 1);
  const conclusionEarly = raw.crossSectionAnalysis?.conclusionTiming === "EARLY";
  const hasUpstreamRemoval = editorialPlan.some((item) => ["DELETE", "MOVE"].includes(item.action) && !/结尾|ENDING/i.test(String(item.location || "")));
  if (overRepeated && conclusionEarly && !hasUpstreamRemoval) {
    const firstOccurrence = insightUnits.find((item) => item.status === "OVER_REPEATED")?.occurrences?.[0] || raw.crossSectionAnalysis?.insightFirstAppearsAt || "最早出现Insight的位置";
    editorialPlan.unshift({ action: "MOVE", location: String(firstOccurrence), evidenceIds: [], purpose: "延迟过早出现的Conclusion；保留其中事实，但把完整Insight移到核心Evidence之后只落一次", lockedFacts: [] });
    editScope = "CROSS_SECTION";
  }
  if (decision === "ASK_USER") editScope = "ASK_USER";
  if (decision === "SHORTEN") editScope = "SHORTEN";
  return {
    overallDiagnosis: String(raw.overallDiagnosis || ""), feedbackInterpretation: String(raw.feedbackInterpretation || ""), dimensions,
    symptom: { location: String(symptom.location || "UNKNOWN"), userFeeling: String(symptom.userFeeling || "") },
    rootCause: { type: String(rootCause.type || ""), locations: (Array.isArray(rootCause.locations) ? rootCause.locations : []).map(String).slice(0, 12), reason: String(rootCause.reason || "") },
    editScope,
    crossSectionAnalysis: raw.crossSectionAnalysis || { insightFirstAppearsAt: "", evidenceOrder: "NO_EVIDENCE", conclusionTiming: "ABSENT", endingHasNewClosureMaterial: false, endingClosureBasis: "" },
    insightUnits,
    rootCauses: (Array.isArray(raw.rootCauses) ? raw.rootCauses : []).slice(0, 6), priorityProblem: raw.priorityProblem || null, decision,
    narrativeSelection, evidenceSufficiency: { status: ["ENOUGH", "PARTIAL", "INSUFFICIENT"].includes(sufficiency.status) ? sufficiency.status : "ENOUGH", recommendedDurationSeconds: Number(sufficiency.recommendedDurationSeconds || fallbackDuration), maxSafeDurationSeconds: Number(sufficiency.maxSafeDurationSeconds || fallbackDuration), reason: String(sufficiency.reason || ""), followUpQuestions: (Array.isArray(sufficiency.followUpQuestions) ? sufficiency.followUpQuestions : []).map(String).filter(Boolean).slice(0, 3) },
    evidenceGap: raw.evidenceGap || { type: "NONE", description: "", researchable: false, queryHint: "", affectedSection: "", importance: "LOW" },
    strongestContentTension: raw.strongestContentTension && raw.strongestContentTension.sideA && raw.strongestContentTension.sideB ? raw.strongestContentTension : null,
    editorialPlan, changeIntentSummary: (Array.isArray(raw.changeIntentSummary) ? raw.changeIntentSummary : []).map(String).filter(Boolean).slice(0, 5),
  };
}

function normalizeActions(actions) {
  return (Array.isArray(actions) ? actions : []).filter((item) => ACTIONS.includes(item.action)).slice(0, 12).map((item) => ({ action: item.action, location: String(item.location || ""), before: String(item.before || ""), after: String(item.after || ""), reason: String(item.reason || "") }));
}

function compactText(value) {
  return String(value || "").replace(/[\s，。！？；：、“”‘’'"()（）—…]/g, "").toLowerCase();
}

function bigrams(value) {
  const text = compactText(value);
  if (text.length < 2) return text ? [text] : [];
  return Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2));
}

function textSimilarity(left, right) {
  const a = bigrams(left); const b = bigrams(right);
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  a.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  let overlap = 0;
  b.forEach((item) => { if ((counts.get(item) || 0) > 0) { overlap += 1; counts.set(item, counts.get(item) - 1); } });
  return Number(((2 * overlap) / (a.length + b.length)).toFixed(3));
}

function sentenceRewriteRatio(before, after) {
  const split = (value) => String(value || "").split(/[。！？；\n]+/).map((item) => item.trim()).filter(Boolean);
  const oldSentences = split(before); const newSentences = split(after);
  if (!oldSentences.length && !newSentences.length) return 0;
  const matched = new Set();
  let kept = 0;
  oldSentences.forEach((oldSentence) => {
    let best = -1; let score = 0;
    newSentences.forEach((newSentence, index) => { const similarity = matched.has(index) ? 0 : textSimilarity(oldSentence, newSentence); if (similarity > score) { score = similarity; best = index; } });
    if (score >= 0.82) { kept += 1; matched.add(best); }
  });
  return Number((1 - kept / Math.max(oldSentences.length, newSentences.length, 1)).toFixed(3));
}

function scriptUnits(script = {}) {
  return [
    { key: "TITLE", label: "标题", text: script.titles?.[0] || "", index: 0 },
    { key: "HOOK", label: "Hook", text: script.hook || "", index: 1 },
    ...(script.sections || []).map((section, index) => ({ key: `SECTION:${section.label || index}`, label: section.label || `段落${index + 1}`, text: section.text || "", index: index + 2 })),
  ];
}

function buildRealDiff(beforeScript, afterScript) {
  const before = scriptUnits(beforeScript); const after = scriptUnits(afterScript);
  const afterByKey = new Map(after.map((unit) => [unit.key, unit]));
  const consumed = new Set(); const sections = [];
  before.forEach((oldUnit) => {
    let next = afterByKey.get(oldUnit.key);
    if (!next && oldUnit.key.startsWith("SECTION:")) next = after.find((unit) => !consumed.has(unit.key) && unit.key.startsWith("SECTION:") && textSimilarity(oldUnit.text, unit.text) >= 0.82);
    if (!next) {
      sections.push({ section: oldUnit.label, before: oldUnit.text, after: "", changeType: "DELETE", similarity: 0, changeRatio: 1, sentenceRewriteRatio: 1, structuralChange: true });
      return;
    }
    consumed.add(next.key);
    const similarity = textSimilarity(oldUnit.text, next.text);
    const oldLength = compactText(oldUnit.text).length; const newLength = compactText(next.text).length;
    const rewriteRatio = sentenceRewriteRatio(oldUnit.text, next.text);
    const moved = oldUnit.index !== next.index;
    let changeType = "KEEP";
    if (moved && similarity >= 0.82) changeType = "MOVE";
    else if (similarity < 0.98) changeType = newLength <= oldLength * 0.78 ? "COMPRESS" : "REWRITE";
    sections.push({ section: oldUnit.label, before: oldUnit.text, after: next.text, changeType, similarity, changeRatio: Number((1 - similarity).toFixed(3)), sentenceRewriteRatio: rewriteRatio, structuralChange: moved });
  });
  after.filter((unit) => !consumed.has(unit.key)).forEach((unit) => sections.push({ section: unit.label, before: "", after: unit.text, changeType: "ADD", similarity: 0, changeRatio: 1, sentenceRewriteRatio: 1, structuralChange: true }));
  const changed = sections.filter((item) => item.changeType !== "KEEP");
  return { sections, summary: { beforeChars: compactText(scriptText(beforeScript)).length, afterChars: compactText(scriptText(afterScript)).length, changedSections: changed.length, totalSections: sections.length, changedSectionRatio: Number((changed.length / Math.max(sections.length, 1)).toFixed(3)), averageSimilarity: Number((sections.reduce((sum, item) => sum + item.similarity, 0) / Math.max(sections.length, 1)).toFixed(3)), structuralChanges: sections.filter((item) => item.structuralChange).length } };
}

function targetDiffs(action, realDiff) {
  const target = compactText(action.target || action.location || "");
  if (!target || /整体|全稿|全文|global|表达|结构/.test(target)) return realDiff.sections;
  const matched = realDiff.sections.filter((item) => target.includes(compactText(item.section)) || compactText(item.section).includes(target));
  return matched.length ? matched : realDiff.sections;
}

function verifyPlan(plan, realDiff, editContract = {}) {
  return plan.filter((item) => item.action !== "KEEP").map((item) => {
    if (item.allowed === false || item.action === "NEED_MORE_EVIDENCE") return { action: item.action, target: item.target || item.location, executed: true, evidenceFromDiff: [], reason: "计划守卫已阻止执行" };
    const diffs = targetDiffs(item, realDiff); let executed = false;
    if (item.action === "DELETE") executed = diffs.some((diff) => diff.changeType === "DELETE" || (!diff.after && diff.before));
    else if (item.action === "MOVE") executed = diffs.some((diff) => diff.changeType === "MOVE" || diff.structuralChange);
    else if (item.action === "COMPRESS" || item.action === "SHORTEN") executed = diffs.some((diff) => ["COMPRESS", "DELETE"].includes(diff.changeType));
    else if (item.action === "REWRITE") executed = diffs.some((diff) => ["REWRITE", "COMPRESS"].includes(diff.changeType) && diff.similarity < 0.98);
    else if (["ADD", "EXPAND"].includes(item.action)) executed = diffs.some((diff) => diff.changeType === "ADD" || compactText(diff.after).length > compactText(diff.before).length * 1.12);
    const globalRewrite = item.action === "REWRITE" && editContract.scope === "GLOBAL";
    if (globalRewrite) executed = realDiff.summary.changedSections > 0;
    return { action: item.action, target: item.target || item.location, executed, evidenceFromDiff: diffs.filter((diff) => diff.changeType !== "KEEP").map((diff) => `${diff.section}:${diff.changeType}`).slice(0, 8), reason: executed ? "真实Diff达到动作阈值" : "真实Diff未达到动作阈值" };
  });
}

function guardEditorialPlan(diagnosis, evidence, currentScript, editContract = {}) {
  const ids = new Map(evidence.map((item) => [item.id, item]));
  const original = scriptText(currentScript);
  diagnosis.editorialPlan = diagnosis.editorialPlan.map((raw) => {
    const evidenceSupport = (raw.evidenceSupport || raw.evidenceIds || []).map(String).filter((id) => ids.has(id));
    const target = String(raw.target || raw.location || "整体"); const reason = String(raw.reason || raw.purpose || "");
    const item = { action: raw.action, target, location: target, reason, purpose: reason, evidenceSupport, evidenceIds: evidenceSupport, allowed: raw.allowed !== false, lockedFacts: raw.lockedFacts || [] };
    if (item.action === "EXPAND" && editContract.needsEvidence === true) {
      const supportRows = evidenceSupport.map((id) => ids.get(id)); const supportedText = supportRows.map((row) => row.text).join("\n");
      const normalizedSupport = compactText(supportedText); const normalizedOriginal = compactText(original);
      const maxUnitSimilarity = Math.max(0, ...scriptUnits(currentScript).map((unit) => textSimilarity(supportedText, unit.text)));
      const alreadyRepresented = normalizedSupport && (normalizedOriginal.includes(normalizedSupport) || maxUnitSimilarity >= 0.58);
      const onlyConclusion = supportRows.length > 0 && supportRows.every((row) => row.source === "confirmedUserConclusion");
      const hasIndependentDetail = supportedText && !alreadyRepresented && !onlyConclusion && normalizedSupport.length >= 18;
      if (!hasIndependentDetail) return { ...item, action: "NEED_MORE_EVIDENCE", allowed: false, guardReason: "Evidence没有提供当前稿之外可安全展开的独立信息单元" };
    }
    return item;
  });
  diagnosis.planGuard = { blockedActions: diagnosis.editorialPlan.filter((item) => item.allowed === false), executableActions: diagnosis.editorialPlan.filter((item) => item.allowed !== false && item.action !== "NEED_MORE_EVIDENCE") };
  return diagnosis;
}

function mechanicalIssues(script) {
  const text = scriptText(script); const issues = [];
  [/你有没有/, /你是不是也/, /你可能也/, /你知道吗/, /大家觉得呢/, /评论区/, /你平时会怎么/, /你怎么看/, /你们?.{0,18}(?:是|会|更).{0,12}(?:还是|或者)/].forEach((pattern) => { if (pattern.test(text)) issues.push({ type: "MECHANICAL_INTERACTION", text: text.match(pattern)?.[0] || pattern.source, reason: "机械互动或投票式结尾" }); });
  return issues;
}

function lockBlindDimensions(diagnosis, currentScript, evidence, conclusion) {
  const key = JSON.stringify({ currentScript, evidence: evidence.map((item) => ({ source: item.source, text: item.text })), conclusion: String(conclusion || "") });
  const cached = blindDiagnosisCache.get(key);
  if (cached) diagnosis.dimensions = JSON.parse(JSON.stringify(cached));
  else {
    blindDiagnosisCache.set(key, JSON.parse(JSON.stringify(diagnosis.dimensions)));
    if (blindDiagnosisCache.size > 100) blindDiagnosisCache.delete(blindDiagnosisCache.keys().next().value);
  }
  diagnosis.blindDiagnosisKey = key.length;
  diagnosis.blindDimensionsLocked = true;
  return diagnosis;
}

function updateRevisionMemory(current = {}, feedback = "", diagnosis = {}, accepted = false) {
  const unique = (items, limit) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].slice(-limit);
  const rootCauses = Array.isArray(diagnosis.rootCauses) ? diagnosis.rootCauses : [];
  const intents = Array.isArray(diagnosis.changeIntentSummary) ? diagnosis.changeIntentSummary : [];
  const resolved = accepted ? rootCauses.map((item) => item.problem) : [];
  const remaining = accepted ? [] : rootCauses.map((item) => item.problem);
  return {
    acceptedPatterns: unique([...(current.acceptedPatterns || []), ...(accepted ? intents : [])], 12),
    rejectedPatterns: unique([...(current.rejectedPatterns || []), ...(!accepted ? intents : [])], 12),
    resolvedProblems: unique([...(current.resolvedProblems || []), ...resolved], 12),
    remainingProblems: unique([...(current.remainingProblems || []).filter((item) => !resolved.includes(item)), ...remaining], 12),
    userFeedback: unique([...(current.userFeedback || []), feedback], 12),
  };
}

async function runStrategicRollback({ llm, previousScript, input, evidence, editContract, creatorVoiceSummary, provider }) {
  const evidenceAssessment = await llm([{ role: "system", content: rollbackEvidenceSystem }, { role: "user", content: JSON.stringify({ userFeedback: input.adjustment || "", editContract, previousScript, evidence }) }], 0.02, { timeoutMs: 30000, maxTokens: 1600, provider: "deepseek" });
  const selectedIds = [...new Set((evidenceAssessment.selectedEvidenceIds || []).map(String))].filter((id) => evidence.some((item) => item.id === id));
  const selectedEvidence = evidence.filter((item) => selectedIds.includes(item.id));
  const sufficient = evidenceAssessment.status === "SUFFICIENT" && selectedEvidence.length > 0;
  const executionPath = editContract.primaryFeedbackLevel === "DIRECTION"
    ? ["FEEDBACK_ROUTER", "CONTENT_DIRECTION_REBUILD", "EVIDENCE_CHECK", sufficient ? "STRATEGY_REBUILD" : "EVIDENCE_GAP", ...(sufficient ? ["SCRIPT_REGENERATE"] : [])]
    : ["FEEDBACK_ROUTER", "EVIDENCE_CHECK", sufficient ? "STRATEGY_REBUILD" : "EVIDENCE_GAP", ...(sufficient ? ["SCRIPT_REGENERATE"] : [])];
  const evidenceGap = sufficient ? { type: "NONE", description: "", researchable: false, affectedSection: "", importance: "LOW" } : {
    type: "MISSING_PERSONAL_DETAIL", description: String(evidenceAssessment.evidenceGap?.description || "当前真实素材里没有足以替换被否定案例的独立经历。请补充一段真实经历，或选择降低/更换结论。"), researchable: false, affectedSection: "全稿", importance: "HIGH",
  };
  const diagnosis = {
    overallDiagnosis: sufficient ? "当前稿不再值得继续润色，已回退并用另一组真实证据重建内容。" : "当前稿的案例或方向已被用户否定，且现有真实素材不足以安全重建。",
    feedbackInterpretation: editContract.userGoal, editScope: editContract.scope, editContract, feedbackLevel: editContract.primaryFeedbackLevel,
    decision: sufficient ? "STRATEGY_REBUILD" : "ASK_USER", rollbackTo: editContract.rollbackTo, executionPath, evidenceGap,
    evidenceAssessment: { status: sufficient ? "SUFFICIENT" : "INSUFFICIENT", selectedEvidenceIds: selectedIds, rejectedEvidenceIds: evidenceAssessment.rejectedEvidenceIds || [], rejectedScriptElements: evidenceAssessment.rejectedScriptElements || [], reason: String(evidenceAssessment.reason || "") },
    editorialPlan: sufficient ? [{ action: "REBUILD_STRATEGY", target: "内容方向与论证路径", allowed: true, reason: "用户已否定当前案例或方向" }, { action: "REGENERATE", target: "全稿", allowed: true, reason: "按新策略重新生成，不沿用旧论证" }] : [{ action: "ASK_USER", target: "真实素材或新方向", allowed: false, reason: evidenceGap.description }],
    changeIntentSummary: [], preserve: editContract.preserve,
  };
  const base = { script: previousScript, editContract, editorialDiagnosis: diagnosis, editorialValidation: null, initialValidation: null, finalValidation: null, editorCallCount: 2, executionPath };
  if (!sufficient) return { ...base, needsEditorialInput: true, editorialQuestions: ["请补充一段可以替代当前案例的真实经历；如果暂时没有，也可以告诉我想降低成什么结论，或改讲哪个真实方向。"], revisionMemory: updateRevisionMemory(input.revisionMemory, input.adjustment, diagnosis, false) };

  const rebuiltStrategy = await llm([{ role: "system", content: strategyRebuildSystem }, { role: "user", content: JSON.stringify({ userFeedback: input.adjustment || "", editContract, selectedEvidence, rejectedScriptElements: evidenceAssessment.rejectedScriptElements || [], previousDirection: input.confirmedDirection || null, previousConclusion: input.confirmedUserConclusion || "", creatorVoiceSummary }) }], 0.08, { timeoutMs: 35000, maxTokens: 1800, provider: "deepseek" });
  const regenerated = await llm([{ role: "system", content: strategicRegenerateSystem }, { role: "user", content: JSON.stringify({ rebuiltStrategy, selectedEvidence, previousScript, creatorVoiceSummary, editContract }) }], 0.12, { timeoutMs: 35000, maxTokens: 2800, provider });
  const script = regenerated?.sections?.length ? { ...previousScript, titles: regenerated.titles?.length ? regenerated.titles : previousScript.titles, hook: regenerated.hook || "", sections: regenerated.sections, changeSummary: (regenerated.changeSummary || ["已更换内容方向和论证路径，并按真实素材重新生成"]).slice(0, 6), rebuiltStrategy } : previousScript;
  const grounding = script === previousScript ? { status: "FAIL", reason: "未生成有效稿件" } : await llm([{ role: "system", content: strategicGroundingSystem }, { role: "user", content: JSON.stringify({ selectedEvidence, rejectedScriptElements: evidenceAssessment.rejectedScriptElements || [], rebuiltStrategy, candidateScript: script }) }], 0.01, { timeoutMs: 30000, maxTokens: 1400, provider: "deepseek" });
  diagnosis.rebuiltStrategy = rebuiltStrategy;
  diagnosis.changeIntentSummary = script.changeSummary || [];
  diagnosis.strategicGrounding = grounding;
  const accepted = script !== previousScript && grounding.status === "PASS" && !(grounding.unsupportedClaims || []).length && !(grounding.remainingRejectedElements || []).length;
  return { ...base, script: accepted ? script : previousScript, editorialDiagnosis: diagnosis, rebuiltStrategy, finalValidation: grounding, editorCallCount: 5, revisionRejected: !accepted, revisionMemory: updateRevisionMemory(input.revisionMemory, input.adjustment, diagnosis, accepted) };
}

async function runContentEditor({ llm, currentScript, input, provider = "deepseek", mode = "revision" }) {
  const previousScript = JSON.parse(JSON.stringify(currentScript));
  const evidence = compactEvidence(input);
  const creatorVoiceSummary = { identityDNA: input.identityDNA || {}, voiceDNA: input.voiceDNA || {}, audience: input.audience || "" };
  const editContract = await routeSemanticEdit({ llm, userFeedback: input.adjustment, currentScript: previousScript, selectedContext: input.selectedContext || null, revisionMemory: input.revisionMemory || {} });
  if (["EVIDENCE", "DIRECTION"].includes(editContract.primaryFeedbackLevel)) return runStrategicRollback({ llm, previousScript, input, evidence, editContract, creatorVoiceSummary, provider });
  const diagnosisPayload = { mode, blindDiagnosisInput: { currentScript: previousScript, evidence, requestedDurationSeconds: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion || "", creatorVoiceSummary }, feedbackInputAfterBlindDiagnosis: { userFeedback: String(input.adjustment || ""), editContract, revisionMemory: input.revisionMemory || {} }, instruction: "必须先完成blindDiagnosis六维并锁定，之后按Edit Contract生成rootCause和Plan。Edit Contract是授权边界，不得重新把反馈归入固定Intent，不得扩大scope或锁定合同未要求preserve的维度。" };
  const rawDiagnosis = await llm([{ role: "system", content: `${diagnosisSystem}\n${expansionSemanticsSystem}` }, { role: "user", content: JSON.stringify(diagnosisPayload) }], 0.05, { timeoutMs: 35000, maxTokens: 2600, provider: "deepseek" });
  const blindLockedDiagnosis = lockBlindDimensions(normalizeDiagnosis(rawDiagnosis, Number(input.duration || 60)), previousScript, evidence, input.confirmedUserConclusion);
  blindLockedDiagnosis.editScope = editContract.scope;
  blindLockedDiagnosis.editContract = editContract;
  blindLockedDiagnosis.feedbackLevel = editContract.primaryFeedbackLevel;
  blindLockedDiagnosis.rollbackTo = editContract.rollbackTo;
  blindLockedDiagnosis.executionPath = executionPathForContract(editContract);
  const diagnosis = guardEditorialPlan(blindLockedDiagnosis, evidence, previousScript, editContract);
  diagnosis.evidenceGap = detectEvidenceGap(input, diagnosis.evidenceGap);
  if (!editContract.needsEvidence) diagnosis.evidenceGap = { type: "NONE", description: "", researchable: false, queryHint: "", affectedSection: "", importance: "LOW" };
  if (editContract.needsEvidence && diagnosis.evidenceGap.type !== "NONE" && diagnosis.evidenceGap.importance === "HIGH") {
    const blocked = { action: diagnosis.evidenceGap.researchable ? "NEED_MORE_EVIDENCE" : "ASK_USER", target: diagnosis.evidenceGap.affectedSection, location: diagnosis.evidenceGap.affectedSection, reason: diagnosis.evidenceGap.description || "缺少可验证证据", evidenceSupport: [], evidenceIds: [], allowed: false, lockedFacts: [] };
    diagnosis.editorialPlan = [...diagnosis.editorialPlan.filter((item) => item.action !== "EXPAND"), blocked];
    diagnosis.planGuard.blockedActions.push(blocked);
    if (diagnosis.evidenceGap.researchable && diagnosis.decision === "ASK_USER") {
      diagnosis.decision = diagnosis.editorialPlan.some((item) => item.allowed !== false && !["KEEP", "NEED_MORE_EVIDENCE", "ASK_USER"].includes(item.action)) ? "REVISE" : "KEEP";
      diagnosis.evidenceSufficiency.followUpQuestions = [];
    }
  }
  if (!editContract.needsEvidence && diagnosis.decision === "ASK_USER" && evidence.length >= 4 && input.confirmedUserConclusion && diagnosis.evidenceSufficiency.status !== "INSUFFICIENT") {
    diagnosis.decision = diagnosis.evidenceSufficiency.status === "PARTIAL" ? "SHORTEN" : "REVISE";
    diagnosis.editorialPlan = diagnosis.editorialPlan.filter((item) => item.action !== "ASK_USER");
    if (!diagnosis.editorialPlan.some((item) => item.action !== "KEEP" && item.allowed !== false)) diagnosis.editorialPlan.push({ action: diagnosis.decision === "SHORTEN" ? "SHORTEN" : "REWRITE", target: diagnosis.priorityProblem?.dimension || "整体", evidenceSupport: [], reason: diagnosis.priorityProblem?.problem || "按诊断修正主要问题", lockedFacts: [], allowed: true });
    diagnosis.evidenceSufficiency.followUpQuestions = [];
  }
  const base = { script: previousScript, editorialDiagnosis: diagnosis, editContract, executionPath: diagnosis.executionPath, editorialValidation: null, initialValidation: null, finalValidation: null, editorCallCount: 2 };
  if (diagnosis.decision === "ASK_USER") return { ...base, needsEditorialInput: true, editorialQuestions: diagnosis.evidenceSufficiency.followUpQuestions, revisionMemory: updateRevisionMemory(input.revisionMemory, input.adjustment, diagnosis, false) };
  if (diagnosis.decision === "KEEP" || !diagnosis.editorialPlan.some((item) => item.action !== "KEEP" && item.allowed !== false)) {
    return { ...base, script: { ...previousScript, changeSummary: diagnosis.changeIntentSummary.length ? diagnosis.changeIntentSummary : ["当前稿没有确定需要修改的问题，本次保留原稿"], appliedActions: [] }, revisionMemory: updateRevisionMemory(input.revisionMemory, input.adjustment, diagnosis, true) };
  }
  const makeCandidate = (raw) => raw?.sections?.length ? { ...previousScript, titles: raw.titles?.length ? raw.titles : previousScript.titles, hook: raw.hook || previousScript.hook, sections: raw.sections, modelAppliedActions: normalizeActions(raw.appliedActions), changeSummary: (raw.changeSummary || diagnosis.changeIntentSummary || []).map(String).filter(Boolean).slice(0, 5) } : previousScript;
  const rawRevision = await llm([{ role: "system", content: `${revisionSystem}\n${expansionSemanticsSystem}` }, { role: "user", content: JSON.stringify({ currentScript: previousScript, evidence, confirmedUserConclusion: input.confirmedUserConclusion || "", editContract, editorialDiagnosis: diagnosis, creatorVoiceSummary }) }], 0.05, { timeoutMs: 35000, maxTokens: 2800, provider });
  let candidate = makeCandidate(rawRevision);
  let realDiff = buildRealDiff(previousScript, candidate);
  let verifiedAppliedActions = verifyPlan(diagnosis.editorialPlan, realDiff, editContract);
  let deterministicTasteIssues = mechanicalIssues(candidate);
  let validation = await llm([{ role: "system", content: validationSystem }, { role: "user", content: JSON.stringify({ previousScript, candidateScript: { ...candidate, modelAppliedActions: undefined }, evidence, confirmedUserConclusion: input.confirmedUserConclusion || "", editContract, editorialPlan: diagnosis.editorialPlan, realDiff, verifiedAppliedActions, creatorVoiceSummary, deterministicTasteIssues }) }], 0.02, { timeoutMs: 35000, maxTokens: 2400, provider: "deepseek" });
  const applyDeterministicValidation = () => {
    const missed = verifiedAppliedActions.filter((item) => !item.executed).map((item) => `${item.action}:${item.target}（${item.reason}）`);
    validation.planExecution = validation.planExecution || { status: "PASS", missedActions: [], unplannedChanges: [] };
    validation.tasteCheck = validation.tasteCheck || { status: "PASS", issues: [] };
    if (missed.length) validation.planExecution = { ...validation.planExecution, status: "FAIL", missedActions: [...(validation.planExecution.missedActions || []), ...missed] };
    if (deterministicTasteIssues.length) validation.tasteCheck = { status: "FAIL", issues: [...(validation.tasteCheck.issues || []), ...deterministicTasteIssues] };
    if (missed.length || deterministicTasteIssues.length) validation.status = "FAIL";
    return [validation.factPreservation, validation.conclusionPreservation, validation.planExecution, validation.tasteCheck, validation.speakability].every((item) => item?.status === "PASS");
  };
  let passed = applyDeterministicValidation();
  validation.status = passed ? "PASS" : "FAIL";
  const initialValidation = JSON.parse(JSON.stringify(validation));
  initialValidation.phase = "INITIAL";
  let finalValidation = JSON.parse(JSON.stringify(initialValidation));
  finalValidation.phase = "FINAL_NO_REPAIR";
  let editorCallCount = 4; let repairAttempted = false;
  if (!passed) {
    repairAttempted = true;
    const targetedRevisionSystem = `${revisionSystem}\n${expansionSemanticsSystem}\n这是唯一一次定向返修。只修复validationFailures和未执行Plan，不重新诊断、不新增方向。按Edit Contract的scope、changeMagnitude和targets完成必要改动，不使用统一比例阈值；LOW允许小而准确的修改，MEDIUM要解决段落关系，HIGH要解决已授权的全局问题。COMPRESS必须删除重复信息单元；MOVE必须改变信息顺序；DELETE必须让目标语义消失。不要输出任何计划之外的互动。`;
    const repairedRaw = await llm([{ role: "system", content: targetedRevisionSystem }, { role: "user", content: JSON.stringify({ originalScript: previousScript, failedCandidate: candidate, evidence, confirmedUserConclusion: input.confirmedUserConclusion || "", editContract, editorialPlan: diagnosis.editorialPlan, realDiff, verifiedAppliedActions, validationFailures: validation, creatorVoiceSummary }) }], 0.02, { timeoutMs: 35000, maxTokens: 2800, provider });
    candidate = makeCandidate(repairedRaw); realDiff = buildRealDiff(previousScript, candidate); verifiedAppliedActions = verifyPlan(diagnosis.editorialPlan, realDiff, editContract); deterministicTasteIssues = mechanicalIssues(candidate); editorCallCount = 6;
    validation = await llm([{ role: "system", content: validationSystem }, { role: "user", content: JSON.stringify({ previousScript, candidateScript: { ...candidate, modelAppliedActions: undefined }, evidence, confirmedUserConclusion: input.confirmedUserConclusion || "", editContract, editorialPlan: diagnosis.editorialPlan, realDiff, verifiedAppliedActions, creatorVoiceSummary, deterministicTasteIssues, phase: "REVALIDATE_AFTER_TARGETED_REVISION" }) }], 0.02, { timeoutMs: 35000, maxTokens: 2400, provider: "deepseek" });
    passed = applyDeterministicValidation();
    validation.status = passed ? "PASS" : "FAIL";
    finalValidation = { ...validation, phase: "FINAL_AFTER_TARGETED_REVISION", targetedRevision: { attempted: true, revalidatedCandidate: true } };
  }
  const acceptedScript = passed ? { ...candidate, appliedActions: verifiedAppliedActions, verifiedAppliedActions, realDiff } : { ...previousScript, changeSummary: ["本次修改未通过事实、结论或计划执行校验，已保留上一版"], appliedActions: [] };
  return { ...base, script: acceptedScript, editorialValidation: finalValidation, initialValidation, finalValidation, realDiff, verifiedAppliedActions, modelAppliedActions: candidate.modelAppliedActions || [], editorCallCount, repairAttempted, revisionRejected: !passed, revisionMemory: updateRevisionMemory(input.revisionMemory, input.adjustment, diagnosis, passed) };
}

const evidenceRevisionSystem = `你是 Content Editor 的局部补证编辑。只修改指定段落，不重新诊断，不改其他段。USER_EVIDENCE只能表示用户亲历。EXTERNAL_EVIDENCE只能表示公开事实，不得改写成“我当时”。只有memoryMatch.userConfirmed=true时，才可将匹配实体与用户模糊记忆建立关联。不得补用户心理、投递数量、结果或原因。推论必须放在inferences并由证据支持。只返回JSON：{"text":"","inferences":[{"id":"INF_1","type":"INFERENCE","claim":"","basedOn":[]}],"changeSummary":[]} 。`;
const evidenceValidationSystem = `你是补证修改审计员。检查新段落是否只使用已确认EXTERNAL_EVIDENCE，是否把外部事实伪装成用户亲历，是否补造用户心理/数量/结果，是否修改了非目标段。只有全部通过才PASS。只返回JSON：{"status":"PASS|FAIL","externalFactsSupported":true,"userExperienceNotFabricated":true,"onlyAffectedSectionChanged":true,"issues":[]} 。`;

async function runEvidenceRevision({ llm, currentScript, sectionIndex, userEvidence = [], externalEvidence = [], memoryMatch = null, editorialPlan = null, provider = "deepseek" }) {
  const confirmed = externalEvidence.filter((item) => item?.type === "EXTERNAL_EVIDENCE" && item.userConfirmed === true);
  if (!confirmed.length) throw Object.assign(new Error("没有已确认的外部证据"), { code: "CONFIRMED_EXTERNAL_EVIDENCE_REQUIRED" });
  const index = Number(sectionIndex);
  if (!Number.isInteger(index) || index < 0 || index >= (currentScript.sections || []).length) throw Object.assign(new Error("受影响段落不存在"), { code: "AFFECTED_SECTION_REQUIRED" });
  const originalSection = currentScript.sections[index];
  const payload = { affectedSection: { index, ...originalSection }, userEvidence, confirmedExternalEvidence: confirmed, memoryMatch, currentEditorialPlan: editorialPlan };
  const revised = await llm([{ role: "system", content: evidenceRevisionSystem }, { role: "user", content: JSON.stringify(payload) }], 0.05, { timeoutMs: 30000, maxTokens: 1600, provider });
  const text = String(revised.text || "").trim();
  if (!text) throw Object.assign(new Error("局部修改结果为空"), { code: "EVIDENCE_REVISION_EMPTY" });
  const candidate = JSON.parse(JSON.stringify(currentScript));
  candidate.sections[index] = { ...candidate.sections[index], text };
  const validation = await llm([{ role: "system", content: evidenceValidationSystem }, { role: "user", content: JSON.stringify({ originalScript: currentScript, candidateScript: candidate, affectedSectionIndex: index, userEvidence, confirmedExternalEvidence: confirmed, memoryMatch, inferences: revised.inferences || [] }) }], 0.01, { timeoutMs: 30000, maxTokens: 1400, provider: "deepseek" });
  const passed = validation.status === "PASS" && validation.externalFactsSupported === true && validation.userExperienceNotFabricated === true && validation.onlyAffectedSectionChanged === true;
  if (!passed) return { script: currentScript, validation: { ...validation, status: "FAIL" }, revisionRejected: true, externalEvidence: confirmed, inferences: [] };
  candidate.changeSummary = (revised.changeSummary || ["用已确认的公开证据补强了相关段落"]).slice(0, 5);
  candidate.evidenceReferences = confirmed;
  return { script: candidate, validation: { ...validation, status: "PASS" }, revisionRejected: false, externalEvidence: confirmed, inferences: revised.inferences || [] };
}

module.exports = { ACTIONS, CATEGORIES, DIMENSIONS, buildRealDiff, compactEvidence, guardEditorialPlan, normalizeDiagnosis, runContentEditor, runEvidenceRevision, textSimilarity, updateRevisionMemory, verifyPlan };
