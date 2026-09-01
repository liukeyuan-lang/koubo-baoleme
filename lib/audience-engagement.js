"use strict";

const MECHANICAL_PATTERNS = [
  { key: "you_have", re: /你有没有/g },
  { key: "you_know", re: /你知道(?:吗|为什么吗?)/g },
  { key: "what_do_you_think", re: /大家觉得呢|你们说是不是|你认同吗/g },
  { key: "comment_cta", re: /评论区告诉我|评论区聊聊|有没有同款/g },
];

function scriptText(script) {
  return `${script?.hook || ""}\n${(script?.sections || []).map((item) => item.text || "").join("\n")}`.trim();
}

function assessMechanicalInteraction(script) {
  const text = scriptText(script);
  const issues = [];
  for (const pattern of MECHANICAL_PATTERNS) {
    const count = (text.match(pattern.re) || []).length;
    if (count > 1 || (count && ["what_do_you_think", "comment_cta"].includes(pattern.key))) issues.push({ type: pattern.key, count });
  }
  const rhetoricalCount = (text.match(/[？?]/g) || []).length;
  if (rhetoricalCount > Math.max(4, Math.ceil(text.replace(/\s/g, "").length / 90))) issues.push({ type: "question_overuse", count: rhetoricalCount });
  const emptyRight = (text.match(/对吧[？?]?/g) || []).length;
  if (emptyRight > 2) issues.push({ type: "right_overuse", count: emptyRight });
  const assumedAudienceExperience = (text.match(/你(?:可能|应该|肯定|大概)?也(?:试过|遇到过|经历过|有过)|你回想一下自己.{0,40}(?:是不是也|也会)/g) || []).length;
  if (assumedAudienceExperience) issues.push({ type: "assumed_audience_experience", count: assumedAudienceExperience });
  const unsupportedGeneralization = (text.match(/这一步往往(?:容易)?被忽略|很多人都|大家通常|所有人都会/g) || []).length;
  if (unsupportedGeneralization) issues.push({ type: "unsupported_audience_generalization", count: unsupportedGeneralization });
  const emptyAgreement = (text.match(/你(?:可能|应该)?会认同|你认同吗/g) || []).length;
  if (emptyAgreement) issues.push({ type: "empty_agreement", count: emptyAgreement });
  if (/对吧[？?]?[^]{0,100}但我(?:不是|没有)[^]{0,160}你知道(?:吗|为什么)/.test(text)) issues.push({ type: "fixed_interaction_template", count: 1 });
  return { status: issues.length ? "FAIL" : "PASS", issues };
}

function assessAudiencePresence(script, contentType = "", duration = 60) {
  const body = (script?.sections || []).map((item) => item.text || "").join("\n");
  const signals = [
    /你(?:可能|第一反应|会觉得|会想|可以想象)/,
    /你(?:想想|仔细想|换个角度想)/,
    /(?:正常|按理|一般)来说/,
    /(?:对吧|但我(?:不是|没有|却|反而)|可我(?:却|偏偏)|偏偏|没想到)/,
    /但(?:真|实际).{0,10}(?:发现|结果|用下来|做下来)/,
    /但(?:真正)?做出来以后.{0,8}(?:我发现|结果)/,
    /但我的实际(?:感受|情况|结果)/,
    /但这样(?:最|很|反而|容易|并)/,
    /(?:换你|这种时候|这不|是不是挺)/,
    /(?:你知道我后来发现什么|你猜后来|换你会怎么判断)/,
  ].filter((pattern) => pattern.test(body)).length;
  const needsPresence = /story|experience|product_tool|opinion|tutorial|knowledge|经历|故事|产品|工具|观点|干货/.test(String(contentType)) && Number(duration || 60) >= 45;
  return { status: needsPresence && signals === 0 ? "WEAK" : "PASS", signals, needsPresence };
}

function assessSpeakability(script) {
  const text = scriptText(script);
  const dangling = text.match(/(?:的时候|因为|所以|如果|虽然|但是|然后|再拍的时候)[，,]?[。！？!?]/g) || [];
  const overloaded = text.split(/[。！？!?\n]/).filter((sentence) => sentence.replace(/\s/g, "").length > 85);
  return { status: dangling.length || overloaded.length ? "FAIL" : "PASS", dangling, overloaded: overloaded.length };
}

module.exports = { assessMechanicalInteraction, assessAudiencePresence, assessSpeakability, scriptText };
