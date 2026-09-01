"use strict";

const crypto = require("crypto");

const GAP_TYPES = ["MISSING_PUBLIC_FACT", "FUZZY_MEMORY", "MISSING_PERSONAL_DETAIL", "NONE"];
const CONFIDENCE = ["HIGH", "MEDIUM", "LOW"];

function detectEvidenceGap(input = {}, diagnosisGap = {}) {
  const text = `${input.currentMaterial || ""}\n${input.followUpAnswer || ""}\n${input.adjustment || ""}`.trim();
  let type = GAP_TYPES.includes(diagnosisGap.type) ? diagnosisGap.type : "NONE";
  if (/(?:忘了|忘记|不记得).*(?:投|做|试|用|见|花|买).*(?:几|多少)|(?:投了|做了|花了).*(?:几|多少).*(?:忘|不记得)/i.test(text)) type = "MISSING_PERSONAL_DETAIL";
  else if (/(?:网站|平台|软件|产品|公司).*(?:名字忘了|想不起|不记得)|记得.*(?:网站|平台|软件).*(?:忘了|好像)/i.test(text)) type = "FUZZY_MEMORY";
  else if (/(?:研究|报告|数据|调查|统计|公开资料).*(?:忘了|不记得|好像|说)|记得.*(?:研究|数据|报告)/i.test(text)) type = "MISSING_PUBLIC_FACT";
  const researchable = ["MISSING_PUBLIC_FACT", "FUZZY_MEMORY"].includes(type);
  const statement = String(diagnosisGap.description || text.match(/[^\n。！？]{0,100}(?:忘了|不记得|好像)[^\n。！？]{0,100}/)?.[0] || "").trim();
  return {
    type, description: statement, researchable,
    queryHint: researchable ? String(diagnosisGap.queryHint || statement).slice(0, 300) : "",
    affectedSection: String(diagnosisGap.affectedSection || diagnosisGap.location || "素材相关段落"),
    importance: ["HIGH", "MEDIUM", "LOW"].includes(diagnosisGap.importance) ? diagnosisGap.importance : type === "NONE" ? "LOW" : "HIGH",
  };
}

function normalizeExternalEvidence(raw = {}, confirmed = false) {
  const sourceUrl = String(raw.sourceUrl || "").trim();
  if (!/^https?:\/\//i.test(sourceUrl)) return null;
  return {
    id: String(raw.id || `EXT_${crypto.randomUUID()}`), type: "EXTERNAL_EVIDENCE",
    claim: String(raw.claim || "").trim().slice(0, 1200), sourceTitle: String(raw.sourceTitle || "").trim().slice(0, 300),
    sourceUrl, publisher: String(raw.publisher || "").trim().slice(0, 200), publishedAt: String(raw.publishedAt || "").trim().slice(0, 40),
    retrievedAt: String(raw.retrievedAt || new Date().toISOString()), confidence: CONFIDENCE.includes(raw.confidence) ? raw.confidence : "LOW",
    matchReason: String(raw.matchReason || "").trim().slice(0, 600), userConfirmed: confirmed === true,
  };
}

function confirmEvidence(candidate, confirmationType, userStatement = "") {
  const evidence = normalizeExternalEvidence(candidate, true);
  if (!evidence) throw Object.assign(new Error("候选证据缺少可追溯来源"), { code: "EVIDENCE_SOURCE_REQUIRED" });
  if (evidence.confidence === "LOW" && candidate.coreFact === true) throw Object.assign(new Error("低可信来源不能作为核心事实"), { code: "LOW_CONFIDENCE_CORE_FACT" });
  return {
    externalEvidence: evidence,
    memoryMatch: confirmationType === "memory_match" ? { userStatement: String(userStatement).slice(0, 1000), matchedEntity: String(candidate.entityName || candidate.sourceTitle || "").slice(0, 300), userConfirmed: true } : null,
  };
}

async function webResearch({ gap, userStatement, existingEvidence = [], fetchImpl = fetch, apiKey = process.env.EVIDENCE_RESEARCH_API_KEY || process.env.OPENAI_API_KEY }) {
  if (!gap?.researchable || !["FUZZY_MEMORY", "MISSING_PUBLIC_FACT"].includes(gap.type)) throw Object.assign(new Error("这个缺口不能通过公开网络查证"), { code: "EVIDENCE_NOT_RESEARCHABLE" });
  if (!apiKey) throw Object.assign(new Error("未配置 Evidence Research 搜索服务"), { code: "EVIDENCE_RESEARCH_NOT_CONFIGURED" });
  const model = process.env.EVIDENCE_RESEARCH_MODEL || "gpt-5-mini";
  const prompt = `你是公开证据研究员。使用 Web Search 查找 3-5 条可追溯候选。优先官方、研究机构、权威媒体。不得把候选平台当成用户当时使用的平台。只返回 JSON。\n缺口:${JSON.stringify(gap)}\n用户原话:${userStatement}\n已有证据:${JSON.stringify(existingEvidence).slice(0, 3000)}\n格式:{"query":"","gapType":"${gap.type}","results":[{"id":"","entityName":"","claim":"","sourceTitle":"","sourceUrl":"https://","publisher":"","publishedAt":"","confidence":"HIGH|MEDIUM|LOW","matchReason":""}]}`;
  const response = await fetchImpl("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, tools: [{ type: "web_search" }], input: prompt, store: false }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(`Evidence Research 服务返回 ${response.status}`), { code: "EVIDENCE_RESEARCH_UPSTREAM", detail: payload.error?.message || "" });
  const outputText = payload.output_text || (payload.output || []).flatMap((item) => item.content || []).map((item) => item.text || "").join("\n");
  const match = outputText.match(/\{[\s\S]*\}/);
  if (!match) throw Object.assign(new Error("搜索结果不完整"), { code: "EVIDENCE_RESEARCH_INVALID_RESPONSE" });
  const parsed = JSON.parse(match[0]);
  const results = (parsed.results || []).map((item) => normalizeExternalEvidence(item, false) && { ...normalizeExternalEvidence(item, false), entityName: String(item.entityName || "").slice(0, 200) }).filter(Boolean).slice(0, 5);
  return { query: String(parsed.query || gap.queryHint), gapType: gap.type, results };
}

module.exports = { GAP_TYPES, confirmEvidence, detectEvidenceGap, normalizeExternalEvidence, webResearch };
