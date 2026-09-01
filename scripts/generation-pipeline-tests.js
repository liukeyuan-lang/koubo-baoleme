"use strict";

const assert = require("assert");
const { createGenerationContext, runGenerationPipeline, deterministicValidation } = require("../lib/generation-pipeline");

const baseInput = {
  duration: 60,
  currentMaterial: "我不会写代码。我用自然语言描述页面和功能，第一版确实做出来了，但输出很浅，产品为什么这样设计仍然需要我判断。",
  confirmedUserConclusion: "做出第一版不等于做好产品，产品判断仍然需要自己完成。",
  confirmedDirection: { type: "product_tool", userConclusion: "做出第一版不等于做好产品，产品判断仍然需要自己完成。" },
  confirmedStrategy: { supportingEvidence: ["第一版确实做出来了", "产品为什么这样设计仍然需要我判断"] },
};

const strategy = { contentGoal: "讲清真实使用落差", targetAudience: "想用AI做产品的人", coreAngle: "做出来与做好之间的差距", coreClaim: baseInput.confirmedUserConclusion, hookStrategy: "先给结果再给落差", structure: ["第一版", "实际问题", "判断"], interactionStrategy: ["预期反转"], tone: "直接自然", evidence: [baseInput.currentMaterial], mustKeep: [baseInput.confirmedUserConclusion], mustNotClaim: ["商业成功"], sourceConstraints: ["不复刻来源"], creatorFitRequirements: [], endingStrategy: "回到仍需判断" };
const script = { titles: ["第一版做出来以后，我反而更需要判断"], hook: "我不会写代码，但第一版真的做出来了。", contentType: "product_tool", sections: [{ label: "落差", text: "看起来最难的一步已经过去了。可我实际做下来才发现，输出很浅，产品为什么这样设计，还是需要我自己判断。" }, { label: "结尾", text: "所以，做出第一版不等于做好产品，产品判断仍然需要自己完成。" }] };
const passingJudge = { passed: true, score: 92, dimensions: { hook: { passed: true }, spokenLanguage: { passed: true }, interaction: { passed: true }, evidence: { passed: true }, unsupportedClaims: { passed: true }, sourceLeakage: { passed: true }, contentDensity: { passed: true }, creatorFit: { passed: true }, conclusion: { passed: true } }, mustFix: [], optionalImprovements: [], severeIssues: [] };

function mockCaller(responses, options = {}) {
  let index = 0;
  return async ({ stage, generationContext }) => {
    if (generationContext.llmCallCount >= generationContext.maxCalls) { const error = new Error("budget"); error.code = "LLM_BUDGET_EXCEEDED"; throw error; }
    generationContext.llmCallCount += 1;
    if (options.timeoutStage === stage) { const error = new Error("timeout"); error.code = "AI_TIMEOUT"; throw error; }
    generationContext.calls.push({ stage, promptTokens: 100, completionTokens: 50, totalTokens: 150, durationMs: 1, success: true, retryCount: 0 });
    generationContext.promptTokens += 100; generationContext.completionTokens += 50; generationContext.totalTokens += 150;
    return structuredClone(responses[index++]);
  };
}

(async () => {
  const normalContext = createGenerationContext("normal");
  const normal = await runGenerationPipeline({ input: baseInput, generationContext: normalContext, callLLM: mockCaller([strategy, script, passingJudge]), strategyCache: new Map() });
  assert.strictEqual(normalContext.llmCallCount, 3, "Judge通过应为3次调用");
  assert.strictEqual(normal.fixed, false);

  const fixContext = createGenerationContext("fix");
  const failedJudge = { ...passingJudge, passed: false, mustFix: ["让结尾更口语"], dimensions: { ...passingJudge.dimensions, spokenLanguage: { passed: false, issues: ["结尾书面"] } } };
  const fixed = await runGenerationPipeline({ input: baseInput, generationContext: fixContext, callLLM: mockCaller([strategy, script, failedJudge, script]), strategyCache: new Map() });
  assert.strictEqual(fixContext.llmCallCount, 4, "普通Fix应为4次调用");
  assert.strictEqual(fixed.fixed, true);
  assert.strictEqual(fixed.finalJudge, null, "普通问题修复后不得复审");

  const severeContext = createGenerationContext("severe");
  const severeJudge = { ...failedJudge, mustFix: ["删除无证据结果"], severeIssues: ["unsupported factual claim"], dimensions: { ...passingJudge.dimensions, unsupportedClaims: { passed: false, issues: ["无证据结果"] } } };
  const severe = await runGenerationPipeline({ input: baseInput, generationContext: severeContext, callLLM: mockCaller([strategy, script, severeJudge, script, passingJudge]), strategyCache: new Map() });
  assert.strictEqual(severeContext.llmCallCount, 5, "严重事实问题最多5次调用");
  assert.strictEqual(severe.finalJudge.passed, true);

  const budgetContext = createGenerationContext("budget", 2);
  await assert.rejects(() => runGenerationPipeline({ input: baseInput, generationContext: budgetContext, callLLM: mockCaller([strategy, script, passingJudge]), strategyCache: new Map() }), (error) => error.code === "LLM_BUDGET_EXCEEDED");

  const timeoutContext = createGenerationContext("timeout");
  await assert.rejects(() => runGenerationPipeline({ input: baseInput, generationContext: timeoutContext, callLLM: mockCaller([strategy], { timeoutStage: "strategy" }), strategyCache: new Map() }), (error) => error.code === "AI_TIMEOUT");

  assert.strictEqual(deterministicValidation({ titles: ["标题"], hook: "Hook", sections: [{ text: "根据上面的文章，我得出了这个结论。" }] }, { duration: 60 }).passed, false, "固定来源泄漏应由本地代码拦截");
  console.log("PASS generation pipeline mock regression: normal=3 fix=4 severe=5 budget timeout deterministic");
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
