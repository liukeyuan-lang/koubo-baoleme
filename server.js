const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile, spawn } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
const os = require("os");
const { detectPlatform, getProvider } = require("./lib/providers");
const { buildEvidence, toAnalysisSource } = require("./lib/source-evidence");
const { assertSafeRemoteUrl, extractAudio } = require("./lib/media");
const { transcribeLocalFile } = require("./lib/local-asr");
const { assessMechanicalInteraction, assessAudiencePresence, assessSpeakability } = require("./lib/audience-engagement");
const { runContentEditor, runEvidenceRevision } = require("./lib/content-editor");
const { confirmEvidence, detectEvidenceGap, webResearch } = require("./lib/evidence-research");
const { createGenerationContext, runGenerationPipeline } = require("./lib/generation-pipeline");
const { convertRecordingBufferToMp4 } = require("./lib/recording-export");
const ffmpegPath = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

loadEnv(path.join(__dirname, ".env"));
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY = 2 * 1024 * 1024;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mp4": "video/mp4", ".wav": "audio/wav", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const VIDEO_ROOT = path.join(__dirname, "video-poc");
const VIDEO_ASSETS = path.join(VIDEO_ROOT, "assets");
const VIDEO_JOBS = path.join(VIDEO_ROOT, "jobs");
const RECORDING_ASSETS = path.join(VIDEO_ROOT, "recordings");
const RECORDING_EDIT_JOBS = path.join(VIDEO_ROOT, "recording-edits");
for (const directory of [VIDEO_ROOT, VIDEO_ASSETS, VIDEO_JOBS, RECORDING_ASSETS, RECORDING_EDIT_JOBS]) fs.mkdirSync(directory, { recursive: true });
const videoJobs = new Map();
const recordingAssets = new Map();
const recordingEditJobs = new Map();
const sourceParseJobs = new Map();
const transcriptionJobs = new Map();
const sourceRateLimits = new Map();
const generationStrategyCache = new Map();
const generationRequests = new Map();
const creatorDnaCache = new Map();
const completenessCache = new Map();
const authTokenCache = new Map();
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const DEFAULT_CONTEXT_VOCABULARY = ["Codex", "ChatGPT", "DeepSeek", "Cursor", "Supabase", "小红书", "口播爆了么", "AI Agent", "PRD", "MVP"];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" });
  res.end(JSON.stringify(data));
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function rawBody(req, max = 30 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > max) { const error = new Error("单个素材不能超过 30MB"); error.code = "ASSET_TOO_LARGE"; throw error; } chunks.push(chunk); }
  return Buffer.concat(chunks);
}

function safeAssetExtension(type, name) {
  const byType = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };
  return byType[type] || ([".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"].includes(path.extname(name).toLowerCase()) ? path.extname(name).toLowerCase() : "");
}

function startVideoJob(input) {
  const id = crypto.randomUUID(); const directory = path.join(VIDEO_JOBS, id);
  fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, "input.json"), JSON.stringify(input, null, 2));
  const job = { id, status: "running", label: "正在生成旁白", createdAt: new Date().toISOString() }; videoJobs.set(id, job);
  const child = spawn(process.execPath, [path.join(__dirname, "scripts", "video-poc-render.js"), directory], { cwd: __dirname, windowsHide: true }); let errorText = "";
  child.stderr.on("data", (chunk) => { errorText += chunk.toString(); });
  child.on("exit", (code) => { try { const result = JSON.parse(fs.readFileSync(path.join(directory, "result.json"), "utf8")); Object.assign(job, result, { status: "complete", label: "生成完成", videoUrl: `/video-poc/jobs/${id}/output.mp4` }); } catch { Object.assign(job, { status: "failed", label: "生成失败", error: errorText.trim().split(/\r?\n/).slice(-3).join("；") || `渲染进程退出（${code}）` }); } });
  return job;
}

function startRecordingEditJob(input) {
  const id = crypto.randomUUID();
  const directory = path.join(RECORDING_EDIT_JOBS, id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "input.json"), JSON.stringify(input, null, 2));
  const job = { id, status: "running", label: "正在准备剪辑", createdAt: new Date().toISOString() };
  recordingEditJobs.set(id, job);
  const child = spawn(process.execPath, [path.join(__dirname, "scripts", "recording-edit-render.js"), directory], { cwd: __dirname, windowsHide: true });
  let errorText = "";
  child.stderr.on("data", (chunk) => { errorText += chunk.toString(); });
  child.on("exit", (code) => {
    try {
      const result = JSON.parse(fs.readFileSync(path.join(directory, "result.json"), "utf8"));
      Object.assign(job, result, { status: "complete", label: "剪辑完成", videoUrl: `/video-poc/recording-edits/${id}/output.mp4` });
    } catch {
      Object.assign(job, { status: "failed", label: "剪辑失败", error: errorText.trim().split(/\r?\n/).slice(-4).join("；") || `剪辑进程退出（${code}）` });
    }
  });
  return job;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end < start) { const error = new Error("模型未返回有效 JSON"); error.code = "AI_INVALID_RESPONSE"; throw error; }
  try { return JSON.parse(source.slice(start, end + 1)); }
  catch { const error = new Error("模型返回的 JSON 无法解析"); error.code = "AI_INVALID_RESPONSE"; throw error; }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 40000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  }
  catch (error) {
    if (error.name === "AbortError") { const timeoutError = new Error("AI 请求超时"); timeoutError.name = "AbortError"; timeoutError.code = "AI_TIMEOUT"; throw timeoutError; }
    const networkError = new Error("无法连接 AI 服务"); networkError.code = "AI_NETWORK_ERROR"; networkError.cause = error; throw networkError;
  } finally { clearTimeout(timeout); }
}

async function llm(messages, temperature = 0.7, options = {}) {
  const provider = options.provider === "doubao" ? "doubao" : "deepseek";
  const key = provider === "doubao" ? process.env.DOUBAO_API_KEY : process.env.LLM_API_KEY;
  const base = (provider === "doubao" ? process.env.DOUBAO_BASE_URL : process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = provider === "doubao" ? process.env.DOUBAO_MODEL : process.env.LLM_MODEL;
  if (!key || !model) {
    const error = new Error(`${provider === "doubao" ? "豆包" : "DeepSeek"} AI 尚未配置。`);
    error.code = "LLM_NOT_CONFIGURED";
    throw error;
  }
  const timeoutMs = Math.max(1000, Math.min(40000, Number(options.timeoutMs || Number(process.env.LLM_TIMEOUT_SECONDS || 40) * 1000)));
  const started = Date.now();
  const { response, text } = await fetchJsonWithTimeout(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature, thinking: { type: provider === "doubao" ? "disabled" : process.env.LLM_THINKING === "enabled" ? "enabled" : "disabled" }, response_format: { type: "json_object" }, max_tokens: Number(options.maxTokens || 4096) }),
    }, timeoutMs);
    if (!response.ok) { const error = new Error(`AI 服务返回 ${response.status}`); error.code = "AI_UPSTREAM_ERROR"; error.upstreamStatus = response.status; throw error; }
    let data;
    try { data = JSON.parse(text); }
    catch { const error = new Error("AI 服务返回了无法解析的响应"); error.code = "AI_INVALID_RESPONSE"; throw error; }
    const parsed = extractJson(data.choices?.[0]?.message?.content || "");
    if (options.generationContext) {
      const usage = data.usage || null;
      options.generationContext.promptTokens += Number(usage?.prompt_tokens || 0);
      options.generationContext.completionTokens += Number(usage?.completion_tokens || 0);
      options.generationContext.totalTokens += Number(usage?.total_tokens || 0);
      if (!usage) options.generationContext.usageUnavailable = true;
      const call = { stage: options.stage || "unknown", model, promptTokens: usage?.prompt_tokens ?? null, completionTokens: usage?.completion_tokens ?? null, totalTokens: usage?.total_tokens ?? null, durationMs: Date.now() - started, success: true, retryCount: Number(options.retryCount || 0) };
      options.generationContext.calls.push(call);
      console.log(`[LLM] requestId=${options.generationContext.requestId} stage=${call.stage} model=${model} prompt_tokens=${call.promptTokens ?? "unavailable"} completion_tokens=${call.completionTokens ?? "unavailable"} total_tokens=${call.totalTokens ?? "unavailable"} duration=${call.durationMs}ms success=true retry_count=${call.retryCount}${usage ? "" : " usage_unavailable=true"}`);
    }
    return parsed;
}

async function callGenerationLLM({ stage, system, payload, maxTokens, generationContext }) {
  if (!generationContext) throw new Error("生成调用缺少 generationContext");
  if (generationContext.llmCallCount >= generationContext.maxCalls) {
    const error = new Error(`单次生成已达到 ${generationContext.maxCalls} 次 LLM 调用上限`);
    error.code = "LLM_BUDGET_EXCEEDED";
    throw error;
  }
  generationContext.llmCallCount += 1;
  let retryCount = 0;
  while (true) {
    try {
      return await llm([{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }], 0.2, { timeoutMs: 35000, maxTokens, provider: "deepseek", generationContext, stage, retryCount });
    } catch (error) {
      const failedCall = { stage, model: process.env.LLM_MODEL, promptTokens: null, completionTokens: null, totalTokens: null, durationMs: null, success: false, retryCount, errorCode: error.code || "UNKNOWN" };
      generationContext.calls.push(failedCall);
      generationContext.usageUnavailable = true;
      console.log(`[LLM] requestId=${generationContext.requestId} stage=${stage} model=${process.env.LLM_MODEL} prompt_tokens=unavailable completion_tokens=unavailable total_tokens=unavailable duration=unavailable success=false retry_count=${retryCount} error=${failedCall.errorCode} usage_unavailable=true`);
      const retryable = ["AI_TIMEOUT", "AI_NETWORK_ERROR", "AI_UPSTREAM_ERROR", "AI_INVALID_RESPONSE"].includes(error.code);
      if (!retryable || retryCount >= 1) throw error;
      retryCount += 1;
      if (generationContext.llmCallCount >= generationContext.maxCalls) {
        const budgetError = new Error(`单次生成已达到 ${generationContext.maxCalls} 次 LLM 调用上限`);
        budgetError.code = "LLM_BUDGET_EXCEEDED";
        throw budgetError;
      }
      generationContext.llmCallCount += 1;
    }
  }
}

function generationSummary(context) {
  const stages = context.calls.map((call) => call.stage).join(",");
  console.log(`[GENERATION SUMMARY] requestId=${context.requestId} llm_calls=${context.llmCallCount} prompt_tokens=${context.usageUnavailable ? `${context.promptTokens} usage_unavailable=true` : context.promptTokens} completion_tokens=${context.completionTokens} total_tokens=${context.totalTokens} stages=${stages}`);
  return { requestId: context.requestId, llmCalls: context.llmCallCount, promptTokens: context.usageUnavailable ? null : context.promptTokens, completionTokens: context.usageUnavailable ? null : context.completionTokens, totalTokens: context.usageUnavailable ? null : context.totalTokens, usageUnavailable: context.usageUnavailable, stages: context.calls.map((call) => call.stage), calls: context.calls };
}

const analysisCache = new Map();
const browserImports = new Map();
function stableHash(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function analysisInput(source) {
  return { url: source.url, contentType: source.contentType, author: source.author, metrics: source.metrics, content: source.content, comments: (source.comments || []).slice(0, 50), videoAnalysis: source.videoAnalysis };
}

function stripHtml(value = "") { return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function meta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) { const match = html.match(pattern); if (match) return stripHtml(match[1]); }
  return "";
}

async function parsePublicPost(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("请输入完整的公开帖子链接"); }
  if (!/(^|\.)xiaohongshu\.com$|(^|\.)xhslink\.com$/i.test(parsed.hostname)) throw new Error("目前只支持小红书公开链接");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(parsed.toString(), { redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; KouboResearch/1.0)" } });
    if (!response.ok) throw new Error(`公开页面返回 ${response.status}`);
    const html = await response.text();
    const title = meta(html, "og:title") || meta(html, "twitter:title");
    const text = meta(html, "og:description") || meta(html, "description");
    if (!title && !text) throw new Error("公开页面未提供可读取的正文信息");
    return {
      platform: "xiaohongshu", url: response.url, contentType: meta(html, "og:type").includes("video") ? "video" : "image_text",
      author: { name: meta(html, "author") || "无法获取", followers: null },
      metrics: { likes: null, collects: null, commentsCount: null, shares: null },
      content: { title, text, transcript: "" }, comments: [], videoAnalysis: null,
      sourceStatus: { fetchedAt: new Date().toISOString(), fieldsAvailable: [title && "title", text && "text"].filter(Boolean) },
    };
  } finally { clearTimeout(timeout); }
}

function countValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim().toLowerCase();
  const number = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return null;
  if (/万|w/.test(text)) return Math.round(number * 10000);
  if (/千|k/.test(text)) return Math.round(number * 1000);
  return Math.round(number);
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function localAsrEnabled() { return process.env.LOCAL_ASR_ENABLED !== "false"; }
function asrConfigured() { return localAsrEnabled() || Boolean(process.env.GROQ_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY); }
function configuredAsrProvider() {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.DASHSCOPE_API_KEY) return "dashscope";
  if (process.env.OPENAI_API_KEY) return "openai";
  return localAsrEnabled() ? "local-funasr" : "";
}

function startTranscriptionJob(source) {
  const id = crypto.randomUUID();
  const job = { id, status: "running", stage: "queued", progress: 5, source: null, error: null, attempts: [], createdAt: Date.now() };
  transcriptionJobs.set(id, job);
  (async () => {
    try {
      const candidates = [...new Set([...(source.media?.videoUrls || []), ...(source.media?.videoCandidates || [])].map(String).filter((url) => url && !url.startsWith("blob:")))].slice(0, 8);
      if (!candidates.length) { const error = new Error("原视频地址未获取或已失效，请回到原帖重新采集"); error.code = "VIDEO_SOURCE_UNAVAILABLE"; throw error; }
      let transcription = null;
      let lastError = null;
      for (const [index, videoUrl] of candidates.entries()) {
        job.stage = "transcribing"; job.progress = Math.min(85, 10 + Math.round((index / candidates.length) * 70));
        try {
          transcription = await transcribeVideo(videoUrl);
          if (String(transcription?.text || "").trim()) { job.attempts.push({ candidate: index + 1, status: "complete" }); break; }
          const empty = new Error("候选视频源没有返回有效逐字稿"); empty.code = "TRANSCRIPTION_EMPTY"; throw empty;
        } catch (error) {
          lastError = error;
          if (localAsrEnabled() && configuredAsrProvider() !== "local-funasr") {
            try {
              job.stage = "local_asr"; job.progress = Math.min(88, job.progress + 5);
              transcription = { ...(await extractAudio(videoUrl, (audioFile) => transcribeLocalAudioWithFunASR(audioFile, { vocabulary: DEFAULT_CONTEXT_VOCABULARY }))), provider: "local-funasr" };
              if (String(transcription?.text || "").trim()) { job.attempts.push({ candidate: index + 1, status: "complete", fallback: "local_funasr" }); break; }
            } catch (fallbackError) { lastError = fallbackError; }
          }
          if (!transcription && process.env.DASHSCOPE_API_KEY) {
            try {
              job.stage = "cloud_upload_asr"; job.progress = Math.min(92, job.progress + 5);
              transcription = { ...(await extractAudio(videoUrl, transcribeFileWithDashScope)), provider: "dashscope" };
              if (String(transcription?.text || "").trim()) { job.attempts.push({ candidate: index + 1, status: "complete", fallback: "cloud_audio_upload" }); break; }
            } catch (fallbackError) { lastError = fallbackError; }
          }
          job.attempts.push({ candidate: index + 1, status: "failed", code: lastError.code || "TRANSCRIPTION_FAILED" });
        }
      }
      if (!transcription) throw lastError || new Error("所有视频候选源均转写失败");
      if (!String(transcription?.text || "").trim()) { const error = new Error("本次仍未识别到有效逐字稿，请回到原帖重新采集"); error.code = "TRANSCRIPTION_EMPTY"; throw error; }
      source.content = { ...(source.content || {}), transcript: String(transcription.text).slice(0, 100000) };
      source.videoAnalysis = { duration: transcription.duration, segments: transcription.segments || [] };
      source.sourceStatus = { ...(source.sourceStatus || {}), transcription: "complete", transcriptionError: "", transcriptionProvider: transcription.provider || configuredAsrProvider(), fieldsAvailable: [...new Set([...(source.sourceStatus?.fieldsAvailable || []), "transcript"])] };
      Object.assign(job, { status: "complete", stage: "complete", progress: 100, source });
    } catch (error) {
      console.error(`[transcription-job] stage=${error.stage || job.stage} code=${error.code || "FAILED"} message=${error.message}`);
      Object.assign(job, { status: "failed", stage: error.stage || job.stage, progress: 100, error: { code: error.code || "TRANSCRIPTION_FAILED", message: error.message } });
    }
  })();
  return job;
}

async function transcribeWithDashScope(videoUrl) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) return null;
  const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const submit = await fetch(`${base}/services/audio/asr/transcription`, {
    method: "POST",
    headers: { ...headers, "X-DashScope-Async": "enable" },
    body: JSON.stringify({
      model: process.env.ASR_URL_MODEL || "qwen3-asr-flash-filetrans",
      input: { file_url: videoUrl },
      parameters: { enable_itn: true, enable_words: true, channel_id: [0] },
    }),
  });
  const submitted = await submit.json();
  if (!submit.ok || !submitted.output?.task_id) throw new Error(submitted.message || `百炼任务提交失败 ${submit.status}`);
  const taskId = submitted.output.task_id;
  let task;
  for (let index = 0; index < Number(process.env.ASR_URL_MAX_POLLS || 450); index += 1) {
    await sleep(2000);
    const response = await fetch(`${base}/tasks/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${key}` } });
    task = await response.json();
    if (!response.ok) throw new Error(task.message || `百炼任务查询失败 ${response.status}`);
    const status = task.output?.task_status;
    if (status === "SUCCEEDED" || status === "FAILED" || status === "CANCELED") break;
  }
  const result = task?.output?.result?.transcription_url
    ? { subtask_status: "SUCCEEDED", ...task.output.result }
    : task?.output?.results?.find((item) => item.subtask_status === "SUCCEEDED");
  if (!result?.transcription_url) {
    const failed = task?.output?.results?.[0] || {};
    throw new Error([failed.code, failed.message].filter(Boolean).join(": ") || `百炼返回结构异常：${JSON.stringify(task?.output || {}).slice(0, 1200)}`);
  }
  const transcriptResponse = await fetch(result.transcription_url);
  if (!transcriptResponse.ok) throw new Error(`百炼结果下载失败 ${transcriptResponse.status}`);
  const payload = await transcriptResponse.json();
  const transcript = payload.transcripts?.[0] || payload.output?.transcripts?.[0] || payload;
  const sentences = transcript.sentences || [];
  return {
    text: transcript.text || sentences.map((item) => item.text).join(""),
    duration: transcript.content_duration_in_milliseconds ? Number(transcript.content_duration_in_milliseconds) / 1000 : Number(task.usage?.duration || 0) || null,
    segments: sentences.map((item) => ({
      start: Number(item.begin_time || 0) / 1000,
      end: Number(item.end_time || 0) / 1000,
      text: String(item.text || "").trim(),
      words: (item.words || []).map((word) => ({ text: word.text, start: Number(word.begin_time || 0) / 1000, end: Number(word.end_time || 0) / 1000 })),
    })).filter((item) => item.text),
  };
}

async function transcribeLocalAudioWithDashScope(file, options = {}) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DashScope ASR 尚未配置");
  const endpoint = process.env.DASHSCOPE_ASR_FILE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(300, Number(process.env.ASR_TIMEOUT_SECONDS || 180)) * 1000);
  try {
    const bytes = await fs.promises.readFile(file);
    const extension = path.extname(file).toLowerCase();
    const audioType = { ".webm": "audio/webm", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".ogg": "audio/ogg", ".mp3": "audio/mpeg" }[extension] || "application/octet-stream";
    const vocabulary = [...new Set([...(options.vocabulary || []), ...DEFAULT_CONTEXT_VOCABULARY])]
      .map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
    const payload = {
      model: process.env.ASR_UPLOAD_MODEL || "qwen3-asr-flash",
      messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: `data:${audioType};base64,${bytes.toString("base64")}` } }] }],
      stream: false,
      asr_options: { language: "zh", enable_itn: true },
    };
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const accessDenied = response.status === 403 && /access.?denied/i.test(detail);
      const error = new Error(accessDenied ? "DashScope API Key 未授权调用本地音频识别模型，请在百炼为该 Key 开启 Qwen ASR 权限" : `百炼本地音频转写失败 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ""}`);
      error.code = accessDenied ? "ASR_ACCESS_DENIED" : "ASR_UPSTREAM_ERROR"; error.stage = "transcribe"; throw error;
    }
    const result = await response.json();
    const text = String(result.choices?.[0]?.message?.content || result.output?.text || "").trim();
    return { text, duration: Number(result.usage?.seconds || 0) || null, segments: [], vocabulary };
  } catch (error) {
    if (error.name === "AbortError") { const timeoutError = new Error("语音转写超过 40 秒，已停止本次请求"); timeoutError.code = "ASR_TIMEOUT"; timeoutError.stage = "transcribe"; throw timeoutError; }
    throw error;
  } finally { clearTimeout(timeout); }
}

async function transcribeLocalAudioWithFunASR(file, options = {}) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-funasr-"));
  const wav = path.join(directory, "recording.wav");
  try {
    try {
      await execFileAsync(ffmpegPath, ["-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], { timeout: 30_000, maxBuffer: 1024 * 1024 });
    } catch (cause) {
      const error = new Error("录音转换失败，请重新安装 npm 依赖后重试"); error.code = "AUDIO_CONVERSION_FAILED"; error.cause = cause; throw error;
    }
    return await transcribeLocalFile(wav, [...new Set([...(options.vocabulary || []), ...DEFAULT_CONTEXT_VOCABULARY])]);
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }).catch(() => {}); }
}

// Existing reference-video transcription path is intentionally kept separate.
async function transcribeFileWithDashScope(file) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DashScope ASR 尚未配置");
  const endpoint = process.env.DASHSCOPE_ASR_FILE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(300, Number(process.env.ASR_TIMEOUT_SECONDS || 180)) * 1000);
  try {
    const bytes = await fs.promises.readFile(file);
    const form = new FormData();
    const extension = path.extname(file).toLowerCase();
    const audioType = { ".webm": "audio/webm", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".ogg": "audio/ogg", ".mp3": "audio/mpeg" }[extension] || "application/octet-stream";
    form.append("file", new Blob([bytes], { type: audioType }), `audio${extension || ".webm"}`);
    form.append("model", process.env.ASR_UPLOAD_MODEL || "qwen3-asr-flash");
    form.append("language", "zh");
    form.append("response_format", "verbose_json");
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Qwen ASR is exposed through DashScope's compatible chat-completions
      // endpoint in regions/accounts where the OpenAI-style transcriptions
      // route is unavailable. Reuse the existing input_audio implementation
      // instead of failing the whole transcription job on a 404.
      if (response.status === 404 && !process.env.DASHSCOPE_ASR_FILE_URL) {
        return await transcribeLocalAudioWithDashScope(file);
      }
      const error = new Error(`百炼本地音频转写失败 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ""}`);
      error.code = "ASR_UPSTREAM_ERROR"; error.stage = "transcribe"; throw error;
    }
    const result = await response.json();
    const segments = (result.segments || result.sentences || []).map((item) => ({ start: Number(item.start ?? (item.begin_time != null ? item.begin_time / 1000 : 0)), end: Number(item.end ?? (item.end_time != null ? item.end_time / 1000 : 0)), text: String(item.text || "").trim() })).filter((item) => item.text);
    return { text: result.text || segments.map((item) => item.text).join(""), duration: result.duration || null, segments };
  } catch (error) {
    if (error.name === "AbortError") { const timeoutError = new Error("长视频语音转写超时，已保留任务信息，可以重新尝试"); timeoutError.code = "ASR_TIMEOUT"; timeoutError.stage = "transcribe"; throw timeoutError; }
    throw error;
  } finally { clearTimeout(timeout); }
}

async function transcribeFileWithGroq(file) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq ASR 尚未配置");
  const endpoint = process.env.GROQ_ASR_URL || "https://api.groq.com/openai/v1/audio/transcriptions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(300, Number(process.env.ASR_TIMEOUT_SECONDS || 180)) * 1000);
  try {
    const bytes = await fs.promises.readFile(file);
    const form = new FormData();
    const extension = path.extname(file).toLowerCase();
    const audioType = { ".webm": "audio/webm", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".ogg": "audio/ogg", ".mp3": "audio/mpeg" }[extension] || "application/octet-stream";
    form.append("file", new Blob([bytes], { type: audioType }), `audio${extension || ".mp3"}`);
    form.append("model", process.env.GROQ_ASR_MODEL || "whisper-large-v3-turbo");
    form.append("language", "zh");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(response.status === 429 ? "Groq 免费语音额度或速率限制已用完，请稍后重试或手动粘贴逐字稿" : `Groq 语音转写失败 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ""}`);
      error.code = response.status === 429 ? "ASR_RATE_LIMITED" : "ASR_UPSTREAM_ERROR"; error.stage = "transcribe"; throw error;
    }
    const result = await response.json();
    const segments = (result.segments || []).map((item) => ({ start: Number(item.start || 0), end: Number(item.end || 0), text: String(item.text || "").trim() })).filter((item) => item.text);
    return { text: String(result.text || segments.map((item) => item.text).join("")), duration: Number(result.duration || 0) || null, segments };
  } catch (error) {
    if (error.name === "AbortError") { const timeoutError = new Error("Groq 语音转写超时，请稍后重新获取逐字稿"); timeoutError.code = "ASR_TIMEOUT"; timeoutError.stage = "transcribe"; throw timeoutError; }
    throw error;
  } finally { clearTimeout(timeout); }
}

const transcriptNormalizationSystem = `你是中文口语转写校对器。你的任务不是润色文案，而是恢复用户真实说话内容。只允许补标点、按自然停顿断句、修复上下文能明确判定的识别错误和专有名词、统一数字格式、删除明显的连续重复口误。保留“就是”“然后”“其实”“我感觉”等自然口语。禁止改变观点、重写表达、增加事实/经历/情绪、根据常识补故事、总结或升华。不能确定的词不要猜，保留原词，并放入 uncertainTerms。只返回 JSON：{"text":"","uncertainTerms":[{"original":"","reason":""}]} 。`;

async function normalizeTranscript(rawTranscript, vocabulary = []) {
  const raw = String(rawTranscript || "").trim();
  if (!raw) return { text: "", uncertainTerms: [], status: "skipped" };
  if (!process.env.LLM_API_KEY || !process.env.LLM_MODEL) return { text: raw, uncertainTerms: [], status: "fallback", error: "LLM_NOT_CONFIGURED" };
  try {
    const result = await llm([
      { role: "system", content: transcriptNormalizationSystem },
      { role: "user", content: JSON.stringify({ rawTranscript: raw, contextVocabulary: vocabulary.slice(0, 30) }) },
    ], 0.1, { maxTokens: 1800, timeoutMs: 20000 });
    const text = String(result.text || "").trim();
    if (!text) throw new Error("校对结果为空");
    return { text, uncertainTerms: Array.isArray(result.uncertainTerms) ? result.uncertainTerms.slice(0, 20) : [], status: "complete" };
  } catch (error) {
    return { text: raw, uncertainTerms: [], status: "fallback", error: error.code || error.message };
  }
}

async function sourceTranscript(source) {
  if (source.media?.audioUrl) {
    return extractAudio(source.media.audioUrl, transcribeFileWithDashScope);
  }
  if (source.media?.videoUrl) return extractAudio(source.media.videoUrl, transcribeFileWithDashScope);
  return null;
}

function sourceJobView(job) {
  return {
    status: job.status, progress: job.progress, source: job.source || {},
    transcript: job.transcript?.segments || [], evidence: job.evidence || {},
    analysis: job.analysis || null, error: job.error || null,
  };
}

async function runSourceParseJob(job, provider, sourceUrl) {
  try {
    job.status = "parsing"; job.progress = 10;
    const normalized = await provider.parse(sourceUrl);
    job.progress = 32;
    let transcript = null;
    let transcriptionError = "";
    if (normalized.media.audioUrl || normalized.media.videoUrl) {
      job.status = "transcribing"; job.progress = 42;
      try { transcript = await sourceTranscript(normalized); }
      catch (error) { transcriptionError = error.message; console.error(`[transcription] stage=${error.stage || "unknown"} code=${error.code || "FAILED"} source=provider message=${error.message}`); }
    }
    const evidence = buildEvidence(normalized, transcript, []);
    const source = toAnalysisSource(normalized, transcript, evidence);
    source.sourceStatus.transcriptionError = transcriptionError;
    job.source = source; job.transcript = transcript; job.evidence = evidence;
    if (!evidence.transcript.available) {
      const error = new Error(transcriptionError || "未取得逐字稿，已停止爆款分析和后续生成"); error.code = "TRANSCRIPT_REQUIRED"; throw error;
    }
    job.status = "analyzing"; job.progress = 72;
    if (process.env.LLM_API_KEY && process.env.LLM_MODEL) {
      try {
        const compact = analysisInput(source);
        const key = stableHash(compact);
        job.analysis = analysisCache.get(key) || await llm([{ role: "system", content: analysisSystem }, { role: "user", content: JSON.stringify(compact) }], 0.3);
        analysisCache.set(key, job.analysis);
      } catch (error) { source.sourceStatus.analysisError = error.message; }
    }
    job.status = "complete"; job.progress = 100;
  } catch (error) {
    job.status = "failed"; job.progress = Math.max(job.progress, 10);
    job.error = { code: error.code || "SOURCE_PARSE_FAILED", message: "自动解析失败，你可以直接粘贴正文或逐字稿继续分析。", detail: error.message };
  }
}

function checkSourceRateLimit(req) {
  const key = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
  const now = Date.now();
  const windowMs = 60_000;
  const limit = Number(process.env.SOURCE_PARSE_RATE_LIMIT || 10);
  const recent = (sourceRateLimits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now); sourceRateLimits.set(key, recent); return true;
}

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  };
}

function supabaseConfigured() {
  const config = supabaseConfig();
  return Boolean(config.url && config.publishableKey);
}

async function supabaseUser(req) {
  const config = supabaseConfig();
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) { const error = new Error("请先登录"); error.code = "AUTH_REQUIRED"; throw error; }
  const cached = authTokenCache.get(token);
  if (cached?.expiresAt > Date.now()) return cached.user;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` }, signal: controller.signal,
    });
    if (!response.ok) { const error = new Error("登录已过期，请重新登录"); error.code = "AUTH_INVALID"; throw error; }
    const payload = await response.json();
    const user = { id: payload.id, email: payload.email || "" };
    authTokenCache.set(token, { user, expiresAt: Date.now() + 60_000 });
    return user;
  } finally { clearTimeout(timeout); }
}

async function supabaseRpc(name, payload, authorization = "") {
  const config = supabaseConfig();
  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: config.publishableKey, "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(data?.message || `Supabase RPC ${name} 失败`); error.code = "SUPABASE_RPC_FAILED"; throw error; }
  return data;
}

async function transcribeWithOpenAI(videoUrl) {
  if (!process.env.OPENAI_API_KEY) return null;
  const parsed = new URL(videoUrl);
  if (!/(^|\.)xhscdn\.com$/i.test(parsed.hostname)) throw new Error("视频源域名不受信任");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const mediaResponse = await fetch(videoUrl, {
      signal: controller.signal,
      headers: { Referer: "https://www.xiaohongshu.com/", "User-Agent": "Mozilla/5.0" },
    });
    if (!mediaResponse.ok) throw new Error(`视频下载失败 ${mediaResponse.status}`);
    const bytes = await mediaResponse.arrayBuffer();
    if (bytes.byteLength > 24 * 1024 * 1024) throw new Error("视频超过 24MB，暂不支持自动转写");
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mediaResponse.headers.get("content-type") || "video/mp4" }), "xiaohongshu.mp4");
    form.append("model", process.env.ASR_MODEL || "whisper-1");
    form.append("language", "zh");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: controller.signal,
    });
    if (!response.ok) throw new Error(`语音转写服务返回 ${response.status}`);
    const result = await response.json();
    return {
      text: result.text || "",
      duration: result.duration || null,
      segments: (result.segments || []).map((segment) => ({
        start: segment.start, end: segment.end, text: String(segment.text || "").trim(),
      })).filter((segment) => segment.text),
    };
  } finally { clearTimeout(timeout); }
}

async function transcribeVideo(videoUrl) {
  if (!videoUrl) return null;
  const parsed = new URL(videoUrl);
  if (!/(^|\.)xhscdn\.com$/i.test(parsed.hostname)) throw new Error("视频源域名不受信任");
  if (process.env.GROQ_API_KEY) return { ...(await extractAudio(videoUrl, transcribeFileWithGroq)), provider: "groq" };
  if (process.env.DASHSCOPE_API_KEY) return { ...(await extractAudio(videoUrl, transcribeFileWithDashScope)), provider: "dashscope" };
  if (process.env.OPENAI_API_KEY) return { ...(await transcribeWithOpenAI(videoUrl)), provider: "openai" };
  if (localAsrEnabled()) return { ...(await extractAudio(videoUrl, (audioFile) => transcribeLocalAudioWithFunASR(audioFile, { vocabulary: DEFAULT_CONTEXT_VOCABULARY }))), provider: "local-funasr" };
  return null;
}

async function parseWithManagedBrowser(url) {
  const script = path.join(__dirname, "scripts", "xhs_single_post.py");
  let stdout = "";
  try {
    ({ stdout } = await execFileAsync(PYTHON_BIN, [script, "--url", url, "--max-comments", "50"], {
      cwd: __dirname,
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" },
    }));
  } catch (processError) {
    const output = String(processError.stdout || "").trim().split(/\r?\n/).filter(Boolean);
    try {
      const failure = JSON.parse(output.at(-1));
      const error = new Error(failure.error || "小红书采集失败");
      error.code = failure.code || "COLLECTION_FAILED";
      throw error;
    } catch (parseError) {
      if (parseError.code) throw parseError;
      const error = new Error(processError.killed ? "小红书页面读取超时" : "小红书采集服务暂时不可用");
      error.code = processError.killed ? "COLLECTION_TIMEOUT" : "COLLECTION_PROCESS_FAILED";
      throw error;
    }
  }
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const raw = JSON.parse(lines.at(-1));
  if (!raw.ok) { const error = new Error(raw.error || "浏览器采集失败"); error.code = raw.code; throw error; }
  const note = raw.note || {};
  const authorProfile = raw.authorProfile || {};
  const videoUrls = (raw.videoUrls || []).filter((item) => !/\.ico(?:\?|$)/i.test(item));
  let transcription = null;
  let transcriptionError = "";
  if (raw.contentType === "video" && videoUrls[0] && asrConfigured()) {
    try { transcription = await transcribeVideo(videoUrls[0]); }
    catch (error) { transcriptionError = error.message; console.error(`[transcription] stage=${error.stage || "unknown"} code=${error.code || "FAILED"} source=managed_browser message=${error.message}`); }
  }
  const comments = (raw.comments || []).map((item) => ({ text: item.text || item.content || "", likeCount: countValue(item.likes ?? item.like_count ?? item.likeCount), author: item.user?.display_name || item.display_name || item.nickname || "" })).filter((item) => item.text);
  const fieldsAvailable = [note.title && "title", note.body && "text", transcription?.text && "transcript", note.author && "author", note.like_count !== "" && "likes", note.collect_count !== "" && "collects", note.comment_count !== "" && "commentsCount", comments.length && "comments", videoUrls.length && "videoUrl"].filter(Boolean);
  if (!note.body || fieldsAvailable.length < 3) { const error = new Error("托管浏览器没有读到足够的帖子正文和数据"); error.code = "CONTENT_INCOMPLETE"; throw error; }
  return {
    platform: "xiaohongshu", url: note.note_url || url, contentType: raw.contentType || "image_text",
    author: { name: note.author || "无法获取", followers: countValue(authorProfile.follower_count), profileUrl: note.author_profile || "" },
    metrics: { likes: countValue(note.like_count), collects: countValue(note.collect_count), commentsCount: countValue(note.comment_count), shares: null },
    content: { title: note.title || "", text: note.body || "", transcript: transcription?.text || "" }, comments,
    media: { videoUrls, images: note.detail_image_urls || [] },
    videoAnalysis: transcription ? { duration: transcription.duration, segments: transcription.segments } : null,
    sourceStatus: { fetchedAt: raw.collectedAt || new Date().toISOString(), fieldsAvailable, source: "managed_browser", commentsCollected: comments.length, commentsExpected: countValue(raw.commentCollection?.expected ?? note.comment_count), commentsTarget: raw.commentCollection?.target || 50, commentsComplete: Boolean(raw.commentCollection?.complete), commentsStopReason: raw.commentCollection?.stopReason || "unknown", transcription: raw.contentType === "video" ? (transcription ? "complete" : transcriptionError ? "failed" : "asr_unavailable") : "not_needed", transcriptionProvider: transcription?.provider || configuredAsrProvider(), transcriptionError },
  };
}

function friendlyCollectionError(error) {
  const message = String(error?.message || "");
  if (error?.code === "LOGIN_OR_LINK_EXPIRED") return "小红书登录状态已失效，或这条分享链接已过期。请先在采集浏览器登录小红书，再复制一条新的分享链接重试";
  if (error?.code === "BACKGROUND_BROWSER_UNAVAILABLE") return "无法创建隔离的后台采集窗口，请重启小红书采集浏览器后重试";
  if (error?.code === "BROWSER_NOT_READY" || /502 Bad Gateway|ECONNREFUSED|连接.*18800/i.test(message)) return "小红书采集浏览器未启动，请先启动采集浏览器后重试";
  if (/Execution context was destroyed|Target page, context or browser has been closed/i.test(message)) return "小红书页面跳转时采集连接中断，请重试一次";
  if (error?.code === "CONTENT_INCOMPLETE") return "页面已打开，但没有读到正文和互动数据。通常是登录失效、链接过期或帖子限制访问";
  return message || "小红书内容暂时无法读取，请稍后重试";
}

const analysisSystem = `你是“口播爆了么”的内容研究员。严格区分：内容结构=怎么讲；传播机制=为什么点开、看完、收藏、评论；可迁移DNA=普通新人能学什么。优先使用视频逐字稿和时间片分析口播；正文只作为补充。若视频没有逐字稿，analysisScope必须为text_only，deliveryStyle所有字段明确写“逐字稿不足，无法判断”，禁止根据正文臆测语速、口语风格或情绪曲线。若有逐字稿，analysisScope为video_transcript，分析句长、语气、情绪推进、信息密度、节奏变化、停顿/强调线索；visualStyle只能依据输入中真实存在的视觉证据，没有画面证据就写“未分析画面”。最多3个关键爆因。结构必须来自本帖且有语义，禁止通用空标签。评论只是公开样本证据，必须写样本数。结合内容类型解释点赞、收藏、评论。低粉结论必须基于完整数据，不得伪造平均倍数。只返回JSON：{"analysisScope":"video_transcript|text_only","whyViral":[],"contentStructure":{"segments":[{"time":"","role":"","summary":""}]},"deliveryStyle":{"languageTone":"","emotionCurve":"","pacing":"","sentenceRhythm":"","emphasisPattern":"","visualStyle":""},"viralMechanism":{"topicMechanism":"","hookMechanism":"","emotionalTrigger":"","valuePromise":"","trustMechanism":"","engagementMechanism":""},"transferableDNA":{"reusable":[],"conditionallyReusable":[],"nonReusable":[]},"commentInsight":{"sampleSize":0,"strongestResonance":"","biggestQuestion":"","highestDemand":"","mainObjection":"","nextTopics":[]},"metricInsight":{"contentType":"教程型|观点型|情绪型|其他","primarySignal":"","reason":""},"popularityCredibility":{"level":"已确认低粉爆款|疑似低粉爆款|热门内容","reason":""},"difficulty":{"level":"简单|中等|困难","reasons":[]}}。`;
const generationSystem = `你是“口播爆了么”的真实内容组织主编。你不是在仿写原文，不是把用户素材填进原视频结构，也不是把素材压缩成事实摘要。目标是不套模板，但把真实事情讲完整。

优先级固定为：1用户真实事实，2用户真实观点，3用户真实经历，4 Voice DNA，5爆款传播机制，6原表达骨架。低优先级不得压过高优先级。

creativePreferences 只控制表达与包装：platform决定平台语境，goal决定内容沟通重点，speakingStyle与titleStyle决定措辞和标题倾向，ctaPreference决定是否允许结尾互动，forbiddenExpressions中的词句不得出现在标题、Hook和正文。偏好不是事实来源，不得因此补充案例、经历、数据、效果或身份。平台规则只能作为表达建议，不得声称保证流量或通过审核。

必须按顺序完成：
1. 用一句话提炼 contentCore：用户凭什么事实、产生了什么判断。
2. 判断 contentType=story|tutorial|opinion|experience|case|knowledge|mixed。先理解内容类型，再决定怎么讲；不得让所有内容共享同一骨架。
3. 建立 contentUnits 可用信息池：background、previousBelief、problem、conflict、triggerEvent、process、difficulty、action、result、realization、opinion、audienceValue，每项都是数组。有就使用，没有就留空。
4. 在 contentUnits 之上建立 storyMaterial：facts=明确事实；moments=可以具体讲述的一次真实事件；tensions=预期与现实、旧认知与新认知、身份与结果等落差；realizations=这件事让用户本人发现了什么；insights=这件事为什么值得别人听。事实不等于故事，不要平均分配篇幅。
5. 从 moments 中选择唯一 coreMoment，并用 storyValue 对候选事件内部评分：specificity、tension、novelty、evidenceStrength、audienceRelevance，各0-3分。分数不是数学真理，只用于判断哪件事情最值得展开。经历型若没有真实Moment，不得编故事，应由完整度接口追问；教程、知识和纯观点不强制Moment。
6. 保留 evidence，并把内容分成三类：A类是 currentMaterial 和 followUpAnswer 明确提供的事实；B类只是A类之间已经被用户表达或逻辑上必然成立的关系；C类是任何新原因、动机、旧经历、过程、结果、机制或评价，禁止使用。identityDNA只决定表达视角，参考爆款只决定传播机制，都不能进入本次事实池。Moment只能来自本次素材和追问答案。
7. 建立 expansionPlan：core、mustExplain、supportingEvidence、missingCriticalInfo、unnecessary。经历型优先把篇幅给 coreMoment、tension 和 realization，背景只保留理解事件所需的部分。
8. 完成用户素材理解后，再分析参考内容的传播机制并判断 mechanismFit=HIGH|MEDIUM|LOW。列出 selectedViralMechanisms 与 rejectedMechanisms。传播机制只提升表达效果，不决定用户讲什么、段数和长度。
9. 根据 contentType + storyMaterial + coreMoment + expansionPlan 设计 finalOutline。每个节点必须推进核心事件或观点，段落数量由素材决定，不得预设任何固定格式。
10. 生成可直接念的口播稿。Hook优先从Result、Tension、Novelty或coreMoment选取，并留下一个正文需要回答的问题，不能一次说完结果、过程和结论。正文优先展开唯一coreMoment，不列开发流水账。经历型即使恰好有三个过程信息，也不得改写成三步教程，除非用户明确在教方法。
11. Realization必须是用户在事件前后发生的具体认知变化；Insight回答为什么值得别人听，但不能扩大证据。不要把“AI降低门槛”当最终洞察就结束，应回到事件回答用户实际承担的工作或判断发生了什么变化。不要强造“AI时代最稀缺的是判断力”等金句。
12. 信息推进检查：每个主要段落必须增加新事实、关系、观点或必要叙事功能。同一事实不能换句话重复；若结果已作Hook，后文应推进到coreMoment和认知变化。
13. 输出前增加 qualityGates：Concrete=经历型是否至少使用一个真实Moment；Tension=素材存在落差时稿件是否使用；OriginalInsight=结论是否仍只是“AI提效、降低门槛、很强大、拥抱AI”等任何账号都能说的话。失败值分别为FAIL_CONCRETE、FAIL_TENSION、FAIL_GENERIC_INSIGHT，教程/知识/纯观点对不适用门槛标记NOT_APPLICABLE。
14. 返修失败门槛时只回到 Moment + Tension + Evidence：表达事件前怎么理解、事件后哪一个具体认知改变。不要要求更深的金句，不得补事实。contentSufficiencyCheck 和 selfCheck 仍需执行一次，禁止无限循环。

禁止默认生成：你肯定也行、相信自己、你一定可以、不要害怕、大胆去做、只要开始就成功了一半、开始比准备好重要、准备永远不会完美。除非它明确属于用户Voice DNA且有上下文依据。结尾必须回到 contentCore，可用认知收束或克制建议，禁止突然上升到人生道理。

默认不生成CTA。只有 input.adjustment 明确要求CTA，或 creativePreferences.ctaPreference 为“自然邀请讨论/明确行动号召”时才允许出现相应强度的互动表达；“自然邀请讨论”不得写点赞、收藏、转发、关注。参考内容存在互动机制不等于用户要求CTA。经历型内容能够自然结束在完整认知时，直接结束。

套话删除规则：只有一句话既没有事实、观点，也没有叙事推进或真实情绪功能时才删除。允许“但真正让我意外的是”等自然连接，允许有素材依据的简短情绪和口语停顿。不要追求每句话都像研究报告一样高密度。

Voice DNA只能改变表达方式，不能创造事实。不得编造工作、收入、创业、粉丝、项目、客户、失败、结果、步骤、案例、数据或观点。

证据边界规则：具体场景、动作、过程、原因、后果和结果只能来自A类事实或必然成立的B类关系。可以把“我用自然语言描述需求、发现不对再让Codex改”组织成连续过程；不得补开发天数、修改次数、熬夜、他人评价、失败、用户数或收入。也不得给教程补“我以前直接总结失败了”，给观点补“用户为什么不回来”，或给某一步补用户没说过的必要性解释。若原因没有提供，就把观察、步骤或观点本身讲清，不替用户证明。contentUnits每一项都必须能指回 currentMaterial 或 followUpAnswer 的原句；自检 fabricatedFacts 必须逐句核对。

时长控制：按自然中文口播约每秒4个汉字估算，允许目标时长上下10%误差。30秒约108-132字，60秒约216-264字，90秒约324-396字。无需精确卡秒，落入容差区间即可。绝不能为了达到字数补用户没说过的原因、旧经历、案例或机制；信息不足以支撑目标时长时，应在 expansionPlan.missingCriticalInfo 说明并触发补充信息，而不是用套话填满。

只返回JSON：{"contentCore":"","contentType":"story|tutorial|opinion|experience|case|knowledge|mixed","contentUnits":{"background":[],"previousBelief":[],"problem":[],"conflict":[],"triggerEvent":[],"process":[],"difficulty":[],"action":[],"result":[],"realization":[],"opinion":[],"audienceValue":[]},"storyMaterial":{"facts":[],"moments":[],"tensions":[],"realizations":[],"insights":[]},"coreMoment":"","storyValue":{"specificity":0,"tension":0,"novelty":0,"evidenceStrength":0,"audienceRelevance":0},"evidence":{"background":"","previousBelief":"","event":"","process":[],"result":"","conflict":"","data":[],"observation":[],"newBelief":""},"expansionPlan":{"core":"","mustExplain":[],"supportingEvidence":[],"missingCriticalInfo":[],"unnecessary":[]},"mechanismFit":"HIGH|MEDIUM|LOW","fitReason":"","selectedViralMechanisms":[],"rejectedMechanisms":[],"finalOutline":[],"qualityGates":{"concrete":"PASS|FAIL_CONCRETE|NOT_APPLICABLE","tension":"PASS|FAIL_TENSION|NOT_APPLICABLE","originalInsight":"PASS|FAIL_GENERIC_INSIGHT|NOT_APPLICABLE"},"titles":["","",""],"hook":"","sections":[{"label":"","text":""}],"contentSufficiencyCheck":{"status":"PASS|UNDER_EXPANDED|OVER_EXPANDED","isStoryNotSummary":true,"evidenceSupportsCore":true,"processExpanded":true,"durationFit":true},"duplicateFactCheck":{"passed":true,"duplicates":[]},"informationProgressionCheck":{"passed":true,"notes":[]},"selfCheck":{"fabricatedFacts":false,"copiedStructure":false,"unsupportedEncouragement":false,"forcedElevation":false,"aiCliches":false,"unsupportedConclusion":false,"redundantLines":false,"userCoreLost":false},"explanation":{"borrowed":[],"usedUserMaterial":[]}}。`;
const completenessSystem = `你是口播素材编辑。判断信息是否足够形成有价值的内容。先识别contentType。经历型、故事型、认知转变型必须至少有一个用户明确提供、可以具体讲述的Moment；“我用了AI做网站”“我不断调整”只是过程概述，不等于具体事件。若只有事实没有Moment，只问一个最有价值的问题：“这件事过程中，有没有一个具体发生过的情况，让你印象特别深？”可结合已有主题轻微具体化，但不得诱导用户确认某个不存在的事件。若已有Moment，再判断是否缺少其中的落差、结果或认知变化，仍只问一个问题，优先级：具体发生什么 > 哪里不符合预期 > 什么改变看法 > 具体结果。教程型有真实步骤即可；事件型可以没有认知变化，不强行升华；纯观点型有观点和两个真实观察即可。不要询问语气、风格或时长。只返回JSON：{"sufficient":true,"contentType":"","hasMoment":true,"question":"","missing":"","missingCriticalInfo":[]}。`;
const voiceSystem = `从用户提供的真实表达样本提取Voice DNA，不评价内容。只返回JSON：{"sentenceLength":"","directness":"","emotionIntensity":"","professionalDensity":"","humorLevel":"","rhetoricalQuestionFrequency":"","storytellingPreference":"","commonTransitions":[],"commonExpressions":[],"avoidPatterns":[]}。`;
const selectionRewriteSystem = `你是口播稿的局部编辑。只改 selectedText，不生成整篇，不补写上下文，不编造经历，不改变 confirmedStrategy。context只包含previous、current、next和strategy，用于保证修改后的句子能自然接在相邻句之间。reason：not_speakable=重排语言路径让第一次朗读更顺，不堆语气词；meaning_wrong=严格按用户补充纠正意思；too_long=精简但保留必要信息；not_me=按必要的creatorPreference调整说法；manual由前端直接替换，不会调用你。userInstruction优先于reason。只返回JSON：{"replacementText":""}。`;
const rewritePlanSystem = `你是口播稿修改策划，不负责写成稿。根据 currentDraft、用户 adjustment 和 adjustmentScope，给最终写作模型一份可执行约束。事实只能来自 currentDraft、currentMaterial、followUpAnswer 和 referenceMaterial；不得创造经历。scope 只能是 hook|ending|engagement|full。engagement表示只在当前稿增加镜头交流节奏，原稿事实、观点、段落主旨和结论逐句保留。列出必须保留、必须修改、禁止出现和验收标准。只返回JSON：{"scope":"hook|ending|engagement|full","mustKeep":[],"mustChange":[],"mustAvoid":[],"acceptanceChecks":[]}。`;
const contentDirectionSystem = `你是“口播爆了么”的内容方向编辑。核心原则：借题，不借答案。先把来源严格拆成 topic、question、transferable mechanisms、sourceConclusion 与 sourceDistinctiveFraming。sourceDistinctiveFraming 是原作者包装话题时创造的独特概念、标签、短语、比喻和二分/对立修辞框架，不包括压力、焦虑、老板、任务、行动、解决问题等话题普通词。sourceConclusion与sourceDistinctiveFraming只用于识别禁区，此后隐藏，禁止改写、同义复刻或让用户案例去证明它。然后只读取 userMaterial 与 followUpAnswer，逐条完成 Evidence→Observation→User Insight→Possible User Conclusion 推导。问自己：完全没看过 sourceConclusion，也不使用sourceDistinctiveFraming，仅凭用户证据，这个结论是否仍成立并能自然表达？再从独立推导结果生成0到3个认知不同的方向。来源可以贡献话题、问题和传播机制，不能贡献答案、独特包装、金句、经历、案例、身份、数据或结果。每个方向必须有 userConclusion 和 supportingEvidence；supportingEvidence 必须逐字摘录自用户输入。coreIdea必须等于userConclusion。framingIndependence只有在删除来源独特表达后仍可成立时才能PASS。不要编造方法、成功结果或认知转变。没有有效方向时返回空数组。只返回JSON：{"sourceDNA":{"topic":"","question":"","mechanisms":[],"sourceEvidence":[],"sourceConclusion":"","sourceDistinctiveFraming":{"concepts":[],"phrases":[],"metaphors":[],"labels":[],"rhetoricalFrames":[]}},"evidenceDerivation":[{"supportingEvidence":[],"observation":"","userInsight":"","possibleUserConclusion":""}],"creatorFit":{"level":"适合|有条件适合|不建议","canBorrow":[],"cannotBorrow":[],"reason":""},"contentDirections":[{"id":"direction-1","type":"SAME_VIEW_NEW_EVIDENCE|GO_ONE_STEP_FURTHER|DIFFERENT_VIEW|MECHANISM_ONLY","title":"","userInsight":"","userConclusion":"","coreIdea":"","relationshipToSource":"","supportingEvidence":[],"userEvidence":[],"conclusionIndependence":{"status":"PASS|FAIL","reason":""},"framingIndependence":{"status":"PASS|FAIL","reason":""},"whySuitable":"","risk":"","recommended":true}],"missingEvidence":[],"recommendation":""}。`;
const directionValidationSystem = `你是 User Conclusion 独立性与证据覆盖审校员。sourceDNA.sourceConclusion 是 REFERENCE_ONLY_DO_NOT_COPY_CONCLUSION，只能用于发现污染。先彻底隐藏它，再只根据userMaterial与followUpAnswer审校。
逐个候选执行硬检查：
1. Conclusion Independence：仅凭用户输入，这个userConclusion是否仍成立；依赖来源作者概念就删除。
2. Evidence Coverage：supportingEvidence必须是用户输入中的逐字片段，至少一条，并直接支持结论中的每一个实质判断。
3. Contradiction：结论不得与任何用户事实矛盾。例如用户说坏结果确实发生，就不能说担心的结果通常不会发生。
4. No Benefit From Existence：用户只是出现过某种行为、情绪或困难，不代表它有价值、能提醒人或有积极功能；用户没明确说过就不得这样解释。
5. No Invented Cause/Method/Result：不得补用户没说的根源、动机、机制、方法、成功经验或可应对能力。建议只有在它是用户已陈述事实关系的直接反面时才可保留，例如用户明确说A没有改善结果且占用了B，才可得出“不要把资源继续用在A，应留给B”，不能再扩展方法。
6. Framing Independence：完全删除sourceDNA.sourceDistinctiveFraming中的独特概念、标签、比喻、短语和修辞框架后，方向是否仍能用用户自己的Evidence与Insight自然表达；不能就删除。普通Topic词不能误杀。
允许删除、缩窄或依据evidenceDerivation把不合格候选替换成另一个由证据直接支持的独立关系；最多3条，不必凑数。每条只表达一个判断，必须写userInsight、userConclusion，coreIdea等于userConclusion，conclusionIndependence.status=PASS、framingIndependence.status=PASS，保留逐字supportingEvidence与userEvidence。不同方向必须是不同证据关系，不是同一答案换标题。只返回JSON：{"contentDirections":[],"removed":[{"id":"","reason":"CONCLUSION_NOT_INDEPENDENT|FRAMING_NOT_INDEPENDENT|EVIDENCE_NOT_COVERED|CONTRADICTS_EVIDENCE|INVENTED_BENEFIT|INVENTED_CAUSE_METHOD_RESULT|OTHER:说明"}],"missingEvidence":[],"recommendation":""}。`;
const directionSplitSystem = `你只做“证据关系拆分”，不创造新观点。检查已有方向及其逐字supportingEvidence，识别其中能分别成立的关系，例如：发生时序/反复模式、行为造成的直接代价、用户明确说出的结果落差、两种资源用途之间的直接选择。若一个userConclusion捆绑了两个以上各自有证据的判断，就拆成各自只有一个userConclusion的方向，最多3个；证据只能支持一个判断就原样返回，不凑数。不得加入原因、机制、积极价值、方法或结果预测。每个方向必须保留直接支持它的逐字supportingEvidence，coreIdea与singleCoreIdea等于userConclusion，conclusionIndependence.status=PASS。只返回JSON：{"contentDirections":[]}。`;
const mergeDirectionSystem = `你负责把两个高度相关且已通过独立性检查的方向合并成一条主线。只能使用两个方向已有的supportingEvidence，生成唯一userConclusion并再次判断：隐藏sourceConclusion且删除sourceDistinctiveFraming后，是否仍能仅凭用户证据自然成立。不能成立或证据无法覆盖时返回mergeable=false。coreIdea与singleCoreIdea都必须等于userConclusion。只返回JSON：{"mergeable":true,"direction":{"id":"merged","type":"GO_ONE_STEP_FURTHER","title":"","userInsight":"","userConclusion":"","coreIdea":"","singleCoreIdea":"","relationshipToSource":"","supportingEvidence":[],"userEvidence":[],"conclusionIndependence":{"status":"PASS","reason":""},"framingIndependence":{"status":"PASS","reason":""},"whySuitable":"","risk":"","recommended":true,"narrativePath":[]},"reason":""}。`;
const framingLeakageSystem = `你是来源独特表达泄漏审校员。只检查script的title、hook、body各段和ending是否复用了sourceDistinctiveFraming的独特概念、标签、短语、比喻、二分框架，或换同义词后仍在复刻同一认知包装。严格区分“主题/用户事实相同”和“包装框架相同”：userEvidence里明确出现的事实、身份、动作和结果，即使与来源话题相关，也不能仅因语义相关就判泄漏；例如用户确实说自己不会代码并做出第一版，这个事实不是“人人都是程序员”的复刻。只有把事实重新包装为来源的标签、口号、比喻、群体概括或相同二分论证时才FAIL。不要把topicCommonWords普通词判为泄漏。若userApprovedSourceFraming=true，可讨论概念本身，但仍禁止复刻来源比喻、金句和整套修辞框架。location只能是title、hook、section:N或ending。只返回JSON：{"status":"PASS|FAIL","leaks":[{"location":"title|hook|section:0|ending","text":"","sourceFraming":"","reason":""}]}。`;
const framingRepairSystem = `你只修复已标记的Source Framing泄漏位置。不得重写未泄漏位置，不改变confirmedUserConclusion、用户事实、段落顺序、时长和语气。标题必须来自confirmedUserConclusion；Hook优先来自用户Moment、Conflict或Insight；Ending必须回到用户自己的结论。用用户证据形成自己的表达框架，不做机械同义词替换。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}]}。`;
const evidenceSufficiencySystem = `你是口播内容密度审校员，不写稿。根据confirmedDirection、userMaterial、followUpAnswer和contentType判断真实素材能支撑多长内容。不能只看字数。
先按内容主要价值选择类型：重点讲某个产品/AI工具的实际使用过程、效果与限制时，优先判product_tool，不要仅因用了第一人称就判experience；重点复盘一次项目决策与结果时判case_review。按内容类型检查：经历型看Context、Trigger、Concrete Moment、Internal Reaction、Consequence、Contrast、Change、Result After Change、Insight；观点型看观点、理由、Evidence、反例/边界、现实意义；方法型看问题、方法、步骤、适用条件、常见坑；产品工具型看使用场景、原问题、实际操作、真实效果、限制、适合谁；案例复盘型看背景、过程、关键决策、冲突、结果、复盘认知。不是每个维度都必须存在：只要已有多个独立信息单元、真实过程或冲突，以及证据支持的Insight，就可以支撑相应长度；不得为了追求完整故事弧强制要求用户提供不存在的成长、改变或改变后结果。
status：ENOUGH=足以支撑用户请求时长且每段都有新信息；PARTIAL=能生成较短内容，但请求时长会导致重复或灌水；INSUFFICIENT=连一条可信短内容也不够。recommendedDurationSeconds与maxSafeDurationSeconds必须由信息维度决定，不迎合requestedDuration。PARTIAL时默认只问1个Information Gain最高的问题，确有两个互补关键缺口才问2个，最多3个。问题优先补Concrete Moment、Conflict、Consequence、Change、Result、Boundary，不能重复已知信息，不能诱导；允许用户回答“没有”。问题里的例子只能帮助理解，不能进入Evidence。Creator Profile不能补事实。只返回JSON：{"status":"ENOUGH|PARTIAL|INSUFFICIENT","contentType":"experience|opinion|tutorial|product_tool|case_review|other","existingEvidence":[{"dimension":"","evidence":""}],"missingDimensions":[],"contentPotential":{"recommendedDurationSeconds":30,"maxSafeDurationSeconds":35,"reason":""},"followUpNeeded":true,"followUpQuestions":[""]}。`;
const contentDensitySystem = `你是成稿内容密度检查员。只依据userEvidence、confirmedUserConclusion和script检查：是否重复表达同一意思；是否有删除后没有信息损失的总结句；是否出现证据不支持的扩写；每段是否新增事实、关系、认知或真实行动。目标不是达到时长，而是把真实内容讲完整后立即停止。若发现问题，cleanedScript只能删除或收紧问题句，不能新增内容、改变结论或重写无问题段。只返回JSON：{"status":"PASS|FAIL","repeatedIdeas":[],"unsupportedExpansion":[],"emptySummarySentences":[],"estimatedDurationSeconds":0,"uniqueInformationUnits":0,"cleanedScript":{"titles":[""],"hook":"","sections":[{"label":"","text":""}]}}。`;
const spokenSystem = `你是口播稿的 Speakability 编辑。目标不是模仿聊天，而是让用户第一次看到就能顺着说下来。根据 fullScript 重写一份独立、完整的自然口语版，覆盖所有关键观点、事实、论证推进和结尾，不能只输出Hook、摘要或一句金句。必须保持 confirmedStrategy、核心观点、事实、用户经历和结论不变。优化规则：一句尽量只承载一个主要意思；信息过多时按自然语义拆分，不能机械按字数切句；删除“因此、从而、与此同时、基于此、值得注意的是、由此可见、以我自己为例”等书面连接词；删除无必要的“这件事让我意识到、这给了我一个启发、真正重要的是、这背后其实说明了”等AI总结腔；不要为了自然主动堆“就是、然后、其实、怎么说呢、嗯、吧”；禁止假装思考；把“基本上就是这样一轮一轮去改”这类口语结构堆叠改成直接动作；逐段检查上一句为什么自然会想到下一句。尽量采用 creatorDNA 已有用词并遵守 creativePreferences。只能使用 fullScript 和 sourceMaterial 已有事实，禁止补造经历、数据、成绩或身份。必须实质重写，不能只换行或改标点。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""},{"label":"","text":""},{"label":"","text":""}]}。`;
const engagementPlanSystem = `你是镜头交流节奏策划，只制定当前稿件的一次性 engagementPlan，不写稿。目标是让讲述者在讲自己的事实时，短暂邀请一个具体观众参与判断，再回到故事。可选动作只有 PULL_IN、INFORMATION_GAP、EXPECTATION_TURN、SHARED_RECOGNITION。根据contentType与真实稿件选择0到4个必要动作：30秒通常1到2个，45到60秒通常2到4个，90秒按内容决定；不是硬凑数。经历型优先场景拉入、预期反转与共同认知；观点型优先熟悉判断、挑战判断与Evidence；干货型优先观众第一反应、常见错误与具体方法；产品工具型优先原预期、实际使用、预期差异和真实限制。after必须逐字引用draft里已经存在的短锚点，purpose只能描述节奏目的。禁止提出新事实、新观点、新方法、新结果、新心理、新CTA；禁止把“你有没有、你知道吗、对吧”当固定模板。只返回JSON：{"moves":[{"type":"PULL_IN|INFORMATION_GAP|EXPECTATION_TURN|SHARED_RECOGNITION","after":"稿件原文短锚点","purpose":""}]}。`;
const audienceEngagementSystem = `你是 Audience Engagement 编辑。根据 engagementPlan 对原稿做一次表达层改写，让它从文章式独白变成面对一个具体观众讲述。只能改变句子顺序、信息释放方式、短暂提问、预期与反转、节奏和文章式连接；所有事实、心理、动作、结果、方法与唯一结论必须与draft和userEvidence完全相同。禁止补常识、建议、成长、解决方案、关系和CTA，也禁止用“你可能也试过/你应该也经历过/你肯定遇到过”替观众虚构经历；可以邀请观众判断当前已给出的场景。不要用“你可能会认同”制造空共鸣。干货型如果Evidence已有错误做法与结果，可把它组织成“这个做法看起来会更快/更完整，但我实际做下来……”的预期反转；不得说观众也做过。产品工具型可用“看起来能做出第一版就够了，但我实际做下来……”连接已有结果。不要整篇对观众说话，要形成“讲→短暂拉入→回故事→必要时再拉入→回到用户Insight”的节奏。不要默认用“你有没有”开头；不要形成“对吧→但我不是→你知道吗→金句”的固定结构；Information Gap一篇最多一次；问句不是必需。若计划动作没有可靠锚点或会新增含义，跳过该动作。每个appliedMove必须填写surfaceText：它是这次实际写进正文section（不是Hook）的逐字新片段；只上报动作或引用原稿锚点不算应用。45到60秒内容只要Evidence允许，至少让一个动作真实出现在正文。标题和段落结构可保留。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}],"appliedMoves":[{"type":"","after":"","surfaceText":"正文中实际出现的逐字片段"}]}。`;
const audienceEngagementSystemStrict = `${audienceEngagementSystem}\nsurfaceText必须是本次新组织且真实写入正文的交流片段，并且draft原文中不存在。复制原稿句子、结果句或after锚点冒充surfaceText，视为未应用。`;
const finalSpeakabilitySystem = `你是最终 Speakability 编辑，输入已经完成 Audience Engagement。只让现有表达第一次朗读更顺嘴：按自然语义拆分过载句，去掉书面连接词、AI总结腔和多余语气词，修正相邻句衔接。必须原样保留 Audience Move 的作用、全部已有事实、用户心理、行动、结果、方法和唯一结论；不得新增或删除信息，不得增加问句、CTA、金句或互动动作。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}]}。`;
const interactionAuditSystem = `你是最终镜头交流审校员，只检查两项：mechanicalInteractionCheck 与 audiencePresence。机械互动包括连续“你有没有/你知道吗”、大家觉得呢、无意义对吧、评论区CTA、机械反问、为互动而互动，以及“你可能也试过/你应该也经历过”这类替观众虚构经历的句子。Audience Presence检查Hook之后观众是否彻底消失；Presence可以由预期、对比、反转、信息缺口或共同判断产生，不要求问句。appliedAudienceMoves只是候选记录，只有动作确实在正文表层形成相应节奏才算已应用；只写在元数据里不算。45到60秒经历型若Hook后仍是纯第一人称时间线，没有观众参与判断、预期或共同认知，必须判WEAK。结合deterministicCheck审校。若PASS，repairedScript返回原稿；若FAIL，只改有问题的对应句或最小相邻范围，其他位置逐字保留。修复只能删减或重排draft已有信息，不能新增事实、观点、方法、结果、心理、CTA，不能改变confirmedUserConclusion。只返回JSON：{"mechanicalInteractionCheck":{"status":"PASS|FAIL","issues":[]},"audiencePresence":{"status":"PASS|WEAK","reason":""},"repairedScript":{"titles":[""],"hook":"","sections":[{"label":"","text":""}]}}。`;
const audienceEvidenceAuditSystem = `你是 Audience Engagement 最终事实审计员，只审计，不润色。逐句对照userEvidence与confirmedUserConclusion。用户事实、心理、动作、方法、结果、过去信念，以及对观众的具体经历/预期断言，都必须有逐字或必然关系支持。“可能会以为某结果”“能上线/能跑/好用”“获得认可”“一般都会”等听起来合理但Evidence没说的内容一律unsupported。单纯改变信息顺序、询问观众如何判断已给出的场景不算新增事实。只返回JSON：{"status":"PASS|FAIL","unsupportedClaims":[{"text":"原稿逐字句子","reason":""}]}。`;
const audienceEvidenceRepairSystem = `你只删除或修复unsupportedClaims对应句，其他句逐字保留。只能删除越界部分、用draft已有句子重排，或用confirmedUserConclusion原意收束；不得新增事实、方法、结果、心理、建议、CTA或新的观众假设。保持至少一个不越界的Audience Move和现有Speakability。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}]}。`;
const goalRevisionDiagnosisSystem = `你是口播稿目标修订诊断编辑。当前只支持goal=MORE_INTERACTIVE。先阅读全文，判断它为什么不像在跟一个具体的人讲话，再决定是否需要修改。互动感不等于增加问句；检查观众是否在Hook后消失、连续“我”叙述、文章式解释、答案过早说完、重复观点、未利用共同预期/冲突/转折/结果/认知、书面连接，以及原稿是否已经自然。
原则是“锁事实，不锁表达”。从currentScript、userEvidence、supportingEvidence中列出必须保留的真实事实；confirmedUserConclusion和confirmedContentDirection必须锁死。只规划实现目标所需的最少修改。动作仅可为KEEP、ADD、DELETE、REWRITE、MOVE；MOVE只允许段内或相邻段的小范围信息释放调整。Audience Move可为0。不要把“对吧→但我不是→你知道吗→金句”当模板。
不得建议新增CTA、行动号召、开放式观点投票或金句；不得把用户的经历、判断、方法改写成观众的经历、判断、方法。共同预期只能用于信息释放，不能冒充事实。
只返回JSON：{"goal":"MORE_INTERACTIVE","overallAssessment":"","lockedFacts":[],"issues":[{"location":"","problem":"","whyItHurtsGoal":"","recommendedAction":"KEEP|ADD|DELETE|REWRITE|MOVE"}],"revisionPlan":[{"location":"","action":"KEEP|ADD|DELETE|REWRITE|MOVE","purpose":"","lockedFactsUsed":[]}]}。`;
const goalRevisionExecutionSystem = `你是Goal-based Script Revision执行编辑。根据revisionDiagnosis对currentScript做“最少但有效”的整稿修订。你可以KEEP、ADD、DELETE、REWRITE，必要时轻微MOVE；可以调整句式、断句、信息释放、少量顺序、互动表达、重复内容、文章式连接和段内结构。
绝对锁死lockedFacts、userEvidence中的真实经历/身份/数据/动作/结果、supportingEvidence、confirmedUserConclusion、confirmedContentDirection。事实的主体也属于事实：不得把“我发现/我判断/我的方法”改成“你会发现/需要你判断/你的方法”。不得新增成长、心理、原因、方法、效果、观众经历、观点比较或通用结论。不得把“更互动”做成随便插“你用过吗”；互动应来自稿件已有的共同预期、冲突、转折、结果或认知。允许删掉语义重复和空泛解释，不要求变长；原稿已自然时可以原样返回，appliedActions为空。
机械互动硬禁区：不得写“你有没有/你是不是也/你可能也/你也遇到过/你也经历过/你知道吗/你认同吗/大家觉得呢/评论区告诉我”。不要断言观众具有某种经历或心理。可以让观众判断稿中已经给出的场景，例如“这种时候，正常反应是什么？”；也可以通过预期与实际结果的反差形成互动，不强制使用问句。
如果诊断指出Hook之后仍是独白，至少要在正文完成一处有效调整，不能只改Hook。产品/工具稿可利用已有结果做“能做出来，然后呢？”的信息缺口，或把已有转折组织成“但真做下来我发现……”；经历稿可让观众先判断已给出的具体场景；观点和干货稿可先呈现常见选择，再释放稿中已有的反转。示例只是机制，不得照抄或补事实。
标题只有明确影响目标时才可微调；不要大规模重组，不要重写80%。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"","text":""}],"appliedActions":[{"action":"KEEP|ADD|DELETE|REWRITE|MOVE","location":"","before":"","after":"","reason":""}],"changeSummary":[]}。`;
const factPreservationSystem = `你是事实保留审校员，只比较originalScript、revisedScript与lockedFacts/userEvidence。表达可以不同，事实语义必须相同。逐项检查：是否增加无依据的事实/经历/心理/原因/方法/结果，是否删除重要事实，是否改变事实。事实主体不可变化：把“我发现/我判断/我使用的方法”改成“你会发现/需要你判断/你的方法”，必须记入changedFacts或addedUnsupportedFacts。对观众新增的具体经历、心理和结果也属于无依据事实。单纯让观众判断稿中已给出的场景，如“这种时候，正常反应是什么？”，没有给出答案或断言，不属于新增事实。不要因为纯措辞变化判FAIL。只返回JSON：{"status":"PASS|FAIL","originalFacts":[],"revisedFacts":[],"addedUnsupportedFacts":[],"removedImportantFacts":[],"changedFacts":[]}。只有后三项都为空才可PASS。`;
const conclusionPreservationSystem = `你是用户结论与内容方向审校员。检查revisedScript是否仍准确表达confirmedUserConclusion并保持confirmedContentDirection；不得偷换成更宏大、更绝对或相反的结论。结尾新增“X是不是比Y更重要”之类原稿没有的比较、投票问题属于新增结论，必须FAIL；但只邀请观众判断稿中已经给出的具体场景、且没有给出新答案的问句，不属于新增结论。只返回JSON：{"status":"PASS|FAIL","reason":"","preservedConclusion":""}。`;
const goalImprovementSystem = `你是MORE_INTERACTIVE目标验收编辑。比较originalScript与revisedScript，并结合revisionDiagnosis、appliedActions和deterministicChecks检查：是否减少文章式独白、增加自然Audience Presence、形成信息释放节奏、减少机械解释、避免机械互动、仍然顺嘴、是否过度修改。互动句数量不是指标；原稿已自然且不改也可以PASS。Minimal Necessary Revision优先：只要1到3处关键修改已带来明确改善，其他段落保持自然独白不构成FAIL；不要要求每段都有问句或观众称呼。只有改动无效、仍明显像原文章、机械互动、事实越界或过度修改时FAIL。只返回JSON：{"status":"PASS|FAIL","improvedAreas":[],"remainingProblems":[],"overEdited":false}。`;
const outlineSystem = `你是口播提纲编辑。根据 sourceMaterial 和 fullScript 生成给“不想背稿”的开口提纲。只输出关键词和短提示，不复制逐字稿长句，不生成长段落。结构应包括开头、内容部分和结尾；每段2-3条提示，每条尽量不超过28个汉字。可以引用用户真实经历作为提示，禁止补造素材。只返回JSON：{"titles":[""],"hook":"","sections":[{"label":"开头|第一部分|第二部分|第三部分|结尾","text":"- 提示一\n- 提示二"}]}。`;
const doubaoFullSystem = `你是中文口播内容主编。根据用户本次真实素材生成一篇可以直接开口讲的自然口语版。必须包含标题、Hook、清晰分段和自然收束；一句尽量只承载一个主要意思，按自然语义和停顿组织表达，不使用书面连接词，不刻意堆语气词。教程可保留步骤，经历优先讲清具体事件，观点不要强编故事。参考爆款只能借传播机制，不能复制其事实、身份、数据和措辞。Creator DNA只影响表达视角，creativePreferences只影响平台语境、沟通目标、语气、标题和CTA，并严格排除其中的forbiddenExpressions；二者都不能成为事实来源。禁止补造用户没有提供的经历、结果、成绩、收入、数据或身份。避免AI套话和空泛鼓励。只返回JSON：{"titles":["","",""],"hook":"","sections":[{"label":"","text":""}],"explanation":{"borrowed":[],"usedUserMaterial":[]}}。`;
const groundingSystem = `你是口播稿唯一一次最终事实返修审校员。只对照 sourceMaterial 和 followUpAnswer，参考爆款、身份档案和常识都不能作为事实来源。若存在confirmedDirection和confirmedStrategy，它们是用户已确认的唯一主线，禁止改变主题、coreIdea和用户结论。逐句检查事实、Moment、Tension、原因、动机、过程、结果、Realization和Insight是否由素材明确提供或必然成立；听起来合理但素材没说也算unsupported。对观众的陈述同样属于事实：“你可能也试过/你是不是也经常”“很多人都”“这一步往往被忽略”等若无Evidence必须删除，只能邀请观众判断稿件已经给出的场景。禁止为了故事性补凌晨、情绪、失败次数、他人质疑或“突然意识到”。Audience Engagement和Speakability已经在上游完成：只要audienceMoves没有新增含义，就必须保留其信息释放顺序、预期反转、短暂拉入和共同判断，不得把稿件还原成文章式独白。根据qualityGates和preflightIssues完成一次修正：经历型应具体展开素材已有的coreMoment；有真实落差必须使用；泛泛的“AI提效/降低门槛/很强大”必须回到事件前后实际改变的认知，不能造金句。合并重复事实，Hook结果不能在正文原样复述，每段必须推进。遵守creativePreferences，并删除forbiddenExpressions中列出的表达。默认删除CTA；仅按ctaPreference保留被明确允许的互动强度。不得用新事实凑时长。只返回JSON：{"passed":true,"issues":[],"hook":"","sections":[{"label":"","text":""}]}。`;

const referenceRebuildSystem = `你是中文口播改写编辑。referenceMaterial 是用户主动选择的参考内容，也是本次改写的主要信息来源。保留其核心主题、论证顺序、信息密度、主要观点与情绪推进；将 currentMaterial 中用户的口述偏好或感悟自然融入。目标是让用户能用自己的口吻直接讲出同一套核心内容，而不是要求用户另写一篇。当 previousDraft 和 adjustment 存在时，这是对当前版本的迭代：previousDraft 是必须保留的基础，只按 adjustment 修改，不要回到空白重新构思。必须重写所有句子：不得连续复用参考原文中的长句或标志性措辞；不得假装参考中的经历、身份、数据属于用户；不得凭空增加事实、案例或承诺。currentMaterial 为空时也可生成。标题、Hook、段落和收束应与参考内容的推进一致，但表达必须全新。只返回JSON：{"titles":["","",""],"hook":"","sections":[{"label":"","text":""}],"contentCore":"","contentType":"opinion|knowledge|tutorial|mixed","finalOutline":[],"qualityGates":{"concrete":"NOT_APPLICABLE","tension":"PASS|NOT_APPLICABLE","originalInsight":"PASS"},"contentSufficiencyCheck":{"status":"PASS","isStoryNotSummary":true,"evidenceSupportsCore":true,"processExpanded":true,"durationFit":true},"selfCheck":{"fabricatedFacts":false,"copiedStructure":false,"unsupportedEncouragement":false,"forcedElevation":false,"aiCliches":false,"unsupportedConclusion":false,"redundantLines":false,"userCoreLost":false},"explanation":{"borrowed":["参考主题与论证推进"],"usedUserMaterial":[]}}。`;

function normalizeDirection(direction, evidenceText) {
  const conclusion = String(direction.userConclusion || direction.singleCoreIdea || direction.coreIdea || "").trim();
  const candidates = [...(direction.supportingEvidence || []), ...(direction.userEvidence || [])]
    .map((item) => String(item).trim()).filter((item, index, all) => item.length >= 4 && all.indexOf(item) === index);
  const supportingEvidence = candidates.filter((item) => evidenceText.includes(item));
  if (!conclusion || !supportingEvidence.length || direction.conclusionIndependence?.status !== "PASS" || direction.framingIndependence?.status !== "PASS") return null;
  const unsupportedInferenceMarkers = ["大脑", "防御机制", "心理机制", "潜意识", "本能", "根源", "提醒作用", "积极作用", "有价值", "通常不会发生", "往往不会发生", "能够应对", "可以应对"];
  if (unsupportedInferenceMarkers.some((marker) => conclusion.includes(marker) && !evidenceText.includes(marker))) return null;
  return { ...direction, userConclusion: conclusion, coreIdea: conclusion, singleCoreIdea: direction.singleCoreIdea || conclusion, supportingEvidence, userEvidence: supportingEvidence, conclusionIndependence: { status: "PASS", reason: direction.conclusionIndependence?.reason || "隐藏来源结论后，仍可由用户证据独立推出。" }, framingIndependence: { status: "PASS", reason: direction.framingIndependence?.reason || "删除来源独特包装后，仍可用用户证据自然表达。" } };
}

function structureDraft(input) {
  const material = String(input.currentMaterial || "").split(/[。！？!?；;\n]+/).map((item) => item.trim()).filter(Boolean);
  const mechanism = input.viralMechanism || {};
  return { title: "结构草稿", isDraft: true, sections: [
    { label: "开头", text: mechanism.hookMechanism || `用“${material[0] || "你的真实观点"}”直接建立注意力。` },
    { label: "真实素材", text: material.slice(0, 3).join("；") || "补充一件真实发生过的事。" },
    { label: "核心观点", text: material.at(-1) || "明确你真正想让观众记住的判断。" },
  ] };
}

function scriptText(script) { return `${script?.hook || ""}\n${(script?.sections || []).map((item) => item.text || "").join("\n")}`.trim(); }
function explicitForbiddenTerms(instruction = "") {
  const terms = [];
  const text = String(instruction);
  const command = "(?:请(?:帮我)?|我希望|我想要?|麻烦)?(?:不要|别再?|去掉|删除|禁用|避免)";
  const directPattern = new RegExp(`(?:^|[，。；;、\\n：:！!？?\\s])${command}(?:出现|使用|说|写|用|保留)?[：:\\s]*[“\\\"'‘]?([^，。；;、\\n”\\\"'’]{1,24})`, "g");
  for (const match of text.matchAll(directPattern)) terms.push(match[1].trim());
  for (const match of text.matchAll(/[“\"'‘]([^”\"'’]{1,20})[”\"'’]/g)) {
    const prefix = text.slice(Math.max(0, match.index - 28), match.index);
    if (new RegExp(`(?:^|[，。；;、\\n：:！!？?\\s])${command}[：:\\s]*$`).test(prefix)) terms.push(match[1].trim());
  }
  return [...new Set(terms.filter(Boolean))].slice(0, 12);
}
function selectionRewriteIssues(original, replacement, reason, instruction) {
  const issues = [];
  if (!replacement.trim() || replacement.trim() === original.trim()) issues.push("没有产生实质修改");
  const forbidden = explicitForbiddenTerms(instruction).filter((term) => replacement.includes(term));
  if (forbidden.length) issues.push(`仍包含用户要求删除的表达：${forbidden.join("、")}`);
  if (reason === "too_long" && replacement.length >= original.length * 0.9) issues.push("用户要求精简，但长度没有明显减少");
  if (reason === "too_exaggerated" && /绝对|一定|所有人|百分之百|彻底|永远/.test(replacement) && !/绝对|一定|所有人|百分之百|彻底|永远/.test(original)) issues.push("降低夸张后反而加入了绝对化表达");
  return issues;
}
function applyAdjustmentScope(generated, previous, scope) {
  if (!previous || !generated) return generated;
  if (scope === "hook") {
    const nextHook = generated.hook || previous.hook;
    const sections = (previous.sections || []).map((section, index) => index === 0 && String(section.text || "").trim() === String(previous.hook || "").trim() ? { ...section, text: nextHook } : section);
    return { ...previous, titles: generated.titles?.length ? generated.titles : previous.titles, title: generated.title || previous.title, hook: nextHook, sections, explanation: generated.explanation || previous.explanation };
  }
  if (scope === "ending") {
    const sections = [...(previous.sections || [])];
    if (sections.length && generated.sections?.length) sections[sections.length - 1] = generated.sections[generated.sections.length - 1];
    return { ...previous, sections, explanation: generated.explanation || previous.explanation };
  }
  return generated;
}
function wholeRewriteIssues(previous, generated, adjustment, scope) {
  if (!previous || !generated) return [];
  const issues = [];
  const before = scriptText(previous);
  const after = scriptText(generated);
  if (!after || after === before) issues.push("没有产生实质修改");
  const forbidden = explicitForbiddenTerms(adjustment).filter((term) => after.includes(term));
  if (forbidden.length) issues.push(`仍包含用户要求删除的表达：${forbidden.join("、")}`);
  if (/(?:更短|精简|简短|利落|压缩)/.test(String(adjustment)) && after.length >= before.length * 0.92) issues.push("用户要求缩短，但稿件长度没有明显减少");
  const visibleSections = (script) => {
    const sections = script.sections || [];
    return sections[0]?.text?.trim() === String(script.hook || "").trim() ? sections.slice(1) : sections;
  };
  if (scope === "hook" && JSON.stringify(visibleSections(generated)) !== JSON.stringify(visibleSections(previous))) issues.push("本次只允许修改开头，但正文发生了变化");
  if (scope === "ending") {
    const oldMain = (previous.sections || []).slice(0, -1);
    const newMain = (generated.sections || []).slice(0, -1);
    if (JSON.stringify(oldMain) !== JSON.stringify(newMain)) issues.push("本次只允许修改结尾，但前文发生了变化");
  }
  if (scope === "engagement") {
    const normalize = (value) => String(value || "").replace(/[\s，。！？；：、,.!?;:'“”‘’（）()\-—…]/g, "");
    const beforeBody = normalize(scriptText(previous));
    const afterBody = normalize(scriptText(generated));
    const bigrams = (value) => Array.from({ length: Math.max(0, value.length - 1) }, (_, index) => value.slice(index, index + 2));
    const originalPairs = bigrams(beforeBody);
    const afterPairs = new Set(bigrams(afterBody));
    const preservation = originalPairs.length ? originalPairs.filter((pair) => afterPairs.has(pair)).length / originalPairs.length : 1;
    if (preservation < 0.78) issues.push(`本次只增加互动感，但原稿内容保留率只有${Math.round(preservation * 100)}%`);
    if ((generated.sections || []).length < Math.max(1, (previous.sections || []).length - 1)) issues.push("增加互动感时删除了原稿段落");
  }
  return issues;
}
function variantQuality(mode, variant, full) {
  const text = scriptText(variant);
  if (!text || /undefined|null|模型错误|error|\{\{.*\}\}/i.test(text)) return { passed: false, reason: "invalid_content" };
  if (mode === "spoken") {
    const fullText = scriptText(full);
    if (text === fullText || (fullText && text.length > 40 && text.includes(fullText.slice(0, Math.min(80, fullText.length))))) return { passed: false, reason: "not_rewritten" };
    const meaningfulSections = (variant.sections || []).filter((item) => String(item.text || "").trim().length >= 18);
    const requiredSections = Math.min(3, Math.max(2, (full?.sections || []).filter((item) => String(item.text || "").trim()).length));
    if (meaningfulSections.length < requiredSections) return { passed: false, reason: "incomplete_sections" };
    if (fullText.length >= 100 && text.length < fullText.length * 0.58) return { passed: false, reason: "too_short" };
    if (text.length > 1200) return { passed: false, reason: "too_long" };
    const bookish = ["因此", "从而", "与此同时", "基于此", "值得注意的是", "由此可见", "以我自己为例", "这件事让我意识到", "这给了我一个启发", "这背后其实说明了"].filter((term) => text.includes(term));
    if (bookish.length) return { passed: false, reason: `bookish:${bookish.join("、")}` };
    const fillerCount = (text.match(/就是|然后|其实|怎么说呢|嗯|吧/g) || []).length;
    const fullFillerCount = (fullText.match(/就是|然后|其实|怎么说呢|嗯|吧/g) || []).length;
    if (fillerCount > fullFillerCount + 2 || fillerCount > Math.max(4, Math.ceil(text.length / 70))) return { passed: false, reason: "filler_overuse" };
    if (text.split(/[。！？!?]/).some((sentence) => sentence.trim().length > 85)) return { passed: false, reason: "sentence_overloaded" };
  }
  if (mode === "outline") {
    const lines = text.split(/\n+/).filter(Boolean);
    if ((variant.sections || []).length < 3 || lines.length < 5 || lines.some((line) => line.length > 90)) return { passed: false, reason: "invalid_outline" };
  }
  return { passed: true, reason: "" };
}

function hasExplicitMomentSignal(input) {
  const material = `${input.currentMaterial || ""}\n${input.followUpAnswer || ""}`;
  const eventSignals = /(第一版|第一次|实际一用|改完以后|重新运行|点了没有反应|发现.{0,20}(?:不对|不符合|没有|变成)|做出来.{0,20}但是|原本.{0,30}结果)/;
  const progressionSignals = /(继续调整|继续修改|让.{0,12}重做|于是.{0,20}(?:修改|调整|接上|处理)|后来.{0,20}(?:运行|成功|可以))/;
  return eventSignals.test(material) && progressionSignals.test(material);
}
function hasExplicitTutorialSignal(input) {
  const material = String(input.currentMaterial || "");
  const ordered = /(?:三步|四步|步骤|方法).*(?:先|第一)/s.test(material) && /(?:再|第二|接着)/.test(material) && /(?:最后|第三)/.test(material);
  return ordered && material.length >= 45;
}

function generationDebug(generated) {
  return {
    contentCore: generated.contentCore || "",
    contentType: generated.contentType || "",
    contentUnits: generated.contentUnits || {},
    facts: generated.storyMaterial?.facts || [],
    moments: generated.storyMaterial?.moments || [],
    tensions: generated.storyMaterial?.tensions || [],
    realizations: generated.storyMaterial?.realizations || [],
    insights: generated.storyMaterial?.insights || [],
    coreMoment: generated.coreMoment || "",
    storyValue: generated.storyValue || {},
    evidence: generated.evidence || {},
    expansionPlan: generated.expansionPlan || {},
    missingCriticalInfo: generated.expansionPlan?.missingCriticalInfo || [],
    mechanismFit: generated.mechanismFit || "",
    selectedViralMechanisms: generated.selectedViralMechanisms || generated.reusableMechanisms || [],
    rejectedMechanisms: generated.rejectedMechanisms || [],
    finalOutline: generated.finalOutline || [],
    qualityGates: generated.qualityGates || {},
    preflightIssues: generated.preflightIssues || {},
    contentSufficiencyCheck: generated.contentSufficiencyCheck || {},
    duplicateFactCheck: generated.duplicateFactCheck || {},
    informationProgressionCheck: generated.informationProgressionCheck || {},
    groundingCheck: generated.groundingCheck || {},
    selfCheck: generated.selfCheck || {},
    engagementPlan: generated.engagementPlan || { moves: [] },
    appliedAudienceMoves: generated.appliedAudienceMoves || [],
    mechanicalInteractionCheck: generated.mechanicalInteractionCheck || null,
    audiencePresence: generated.audiencePresence || null,
    speakabilityCheck: generated.speakabilityCheck || null,
  };
}

function mergeScript(base, next) {
  if (!next || !Array.isArray(next.sections) || !next.sections.length) return base;
  return { ...base, titles: next.titles?.length ? next.titles : base.titles, hook: String(next.hook || base.hook || ""), sections: next.sections };
}

function hasVerifiedAudienceSurface(generated) {
  const hook = String(generated.hook || "").trim();
  const body = (generated.sections || []).filter((section) => String(section.text || "").trim() !== hook).map((section) => section.text || "").join("\n");
  return (generated.appliedAudienceMoves || []).some((move) => {
    const surface = String(move.surfaceText || "").trim();
    return surface.length >= 4 && surface !== hook && body.includes(surface) && !String(generated.audienceOriginalText || "").includes(surface);
  });
}

function resolveAudiencePresence(generated, contentType, duration) {
  const check = assessAudiencePresence(generated, contentType, duration);
  if (check.status === "WEAK" && assessMechanicalInteraction(generated).status === "PASS" && hasVerifiedAudienceSurface(generated)) {
    return { status: "PASS", signals: check.signals, needsPresence: check.needsPresence, verifiedSurfaceMove: true };
  }
  return check;
}

function normalizeRevisionActions(actions) {
  const allowed = new Set(["KEEP", "ADD", "DELETE", "REWRITE", "MOVE", "COMPRESS", "EXPAND", "SHORTEN"]);
  return (Array.isArray(actions) ? actions : []).filter((item) => allowed.has(item.action)).slice(0, 8).map((item) => ({ action: item.action, location: String(item.location || ""), before: String(item.before || ""), after: String(item.after || ""), reason: String(item.reason || "") }));
}

async function auditGoalRevision(originalScript, revisedScript, diagnosis, input, appliedActions) {
  const shared = { originalScript, revisedScript, lockedFacts: diagnosis.lockedFacts || [], userEvidence: [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])].filter(Boolean), confirmedUserConclusion: input.confirmedUserConclusion || "", confirmedContentDirection: input.confirmedDirection || null };
  const [factPreservationCheck, conclusionPreservationCheck] = await Promise.all([
    llm([{ role: "system", content: factPreservationSystem }, { role: "user", content: JSON.stringify(shared) }], 0.02, { timeoutMs: 15000, maxTokens: 1200, provider: "deepseek" }),
    llm([{ role: "system", content: conclusionPreservationSystem }, { role: "user", content: JSON.stringify(shared) }], 0.02, { timeoutMs: 12000, maxTokens: 600, provider: "deepseek" }),
  ]);
  const deterministicChecks = { mechanicalInteractionCheck: assessMechanicalInteraction(revisedScript), audiencePresence: assessAudiencePresence(revisedScript, input.confirmedDirection?.type || revisedScript.contentType || "other", input.duration), speakabilityCheck: assessSpeakability(revisedScript) };
  const revisedText = scriptText(revisedScript);
  const goalMechanicalPatterns = [/你有没有/, /你是不是也/, /你可能也/, /你也(?:遇到|经历|试过|有过)/, /你知道吗/, /你认同吗/, /大家觉得呢/, /评论区告诉我/, /你觉得.{0,20}是不是比.{0,20}更/];
  const goalMechanicalHits = goalMechanicalPatterns.filter((pattern) => pattern.test(revisedText)).map((pattern) => pattern.source);
  if (goalMechanicalHits.length) deterministicChecks.mechanicalInteractionCheck = { status: "FAIL", issues: [...(deterministicChecks.mechanicalInteractionCheck.issues || []), ...goalMechanicalHits.map((pattern) => ({ type: "goal_revision_mechanical_phrase", pattern }))] };
  const goalImprovementCheck = await llm([{ role: "system", content: goalImprovementSystem }, { role: "user", content: JSON.stringify({ originalScript, revisedScript, revisionDiagnosis: diagnosis, appliedActions, deterministicChecks }) }], 0.02, { timeoutMs: 15000, maxTokens: 900, provider: "deepseek" });
  const factListsEmpty = ["addedUnsupportedFacts", "removedImportantFacts", "changedFacts"].every((key) => !factPreservationCheck[key]?.length);
  factPreservationCheck.status = factPreservationCheck.status === "PASS" && factListsEmpty ? "PASS" : "FAIL";
  conclusionPreservationCheck.status = conclusionPreservationCheck.status === "PASS" ? "PASS" : "FAIL";
  if (deterministicChecks.mechanicalInteractionCheck.status === "FAIL" || deterministicChecks.speakabilityCheck.status === "FAIL") goalImprovementCheck.status = "FAIL";
  return { factPreservationCheck, conclusionPreservationCheck, goalImprovementCheck, ...deterministicChecks };
}

async function reviseScriptByGoal({ currentScript, goal, input, provider }) {
  if (goal !== "MORE_INTERACTIVE") throw new Error(`暂不支持修订目标：${goal}`);
  const originalScript = JSON.parse(JSON.stringify(currentScript));
  const diagnosisInput = { goal, currentScript: originalScript, userEvidence: [input.currentMaterial, input.followUpAnswer].filter(Boolean), supportingEvidence: input.confirmedStrategy?.supportingEvidence || [], confirmedUserConclusion: input.confirmedUserConclusion || "", confirmedContentDirection: input.confirmedDirection || null, creatorContext: { identityDNA: input.identityDNA || {}, voiceDNA: input.voiceDNA || {}, audience: input.audience || "" } };
  const diagnosis = await llm([{ role: "system", content: goalRevisionDiagnosisSystem }, { role: "user", content: JSON.stringify(diagnosisInput) }], 0.08, { timeoutMs: 18000, maxTokens: 1800, provider: "deepseek" });
  diagnosis.goal = goal;
  diagnosis.issues = Array.isArray(diagnosis.issues) ? diagnosis.issues : [];
  diagnosis.revisionPlan = Array.isArray(diagnosis.revisionPlan) ? diagnosis.revisionPlan : [];
  if (!diagnosis.issues.length || !diagnosis.revisionPlan.some((item) => item.action && item.action !== "KEEP")) {
    return { ...originalScript, revisionDiagnosis: diagnosis, appliedActions: [], changeSummary: ["当前稿的交流节奏已经自然，本次保留原稿"], factPreservationCheck: { status: "PASS", originalFacts: diagnosis.lockedFacts || [], revisedFacts: diagnosis.lockedFacts || [], addedUnsupportedFacts: [], removedImportantFacts: [], changedFacts: [] }, conclusionPreservationCheck: { status: "PASS", reason: "未改变原稿", preservedConclusion: input.confirmedUserConclusion || "" }, goalImprovementCheck: { status: "PASS", improvedAreas: ["原稿无需额外修改"], remainingProblems: [], overEdited: false }, mechanicalInteractionCheck: assessMechanicalInteraction(originalScript), audiencePresence: assessAudiencePresence(originalScript, input.confirmedDirection?.type || originalScript.contentType || "other", input.duration), speakabilityCheck: assessSpeakability(originalScript) };
  }
  const executionInput = { goal, currentScript: originalScript, revisionDiagnosis: diagnosis, lockedFacts: diagnosis.lockedFacts || [], userEvidence: diagnosisInput.userEvidence, supportingEvidence: diagnosisInput.supportingEvidence, confirmedUserConclusion: diagnosisInput.confirmedUserConclusion, confirmedContentDirection: diagnosisInput.confirmedContentDirection, creatorContext: diagnosisInput.creatorContext };
  let revised;
  let audits;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const failureBrief = attempt ? { factPreservation: audits.factPreservationCheck.status, addedUnsupportedFacts: audits.factPreservationCheck.addedUnsupportedFacts || [], removedImportantFacts: audits.factPreservationCheck.removedImportantFacts || [], changedFacts: audits.factPreservationCheck.changedFacts || [], conclusionPreservation: audits.conclusionPreservationCheck.status, conclusionReason: audits.conclusionPreservationCheck.reason || "", goalImprovement: audits.goalImprovementCheck.status, remainingProblems: audits.goalImprovementCheck.remainingProblems || [], mechanicalIssues: audits.mechanicalInteractionCheck.issues || [], audiencePresence: audits.audiencePresence.status, speakability: audits.speakabilityCheck.status } : null;
    const retryInstruction = attempt ? `\n上次版本未通过审校。必须删除addedUnsupportedFacts，恢复removedImportantFacts的完整语义，纠正changedFacts；这些事实可以换说法，但不能消失。mechanicalIssues针对整篇，包括原稿里已有的机械短语，必须全部改掉。必须执行revisionPlan中的必要非KEEP动作，并在Hook之后的正文解决remainingProblems；不能只改Hook。只修复失败项，不得借机扩大修改范围。` : "";
    const rawRevision = await llm([{ role: "system", content: `${goalRevisionExecutionSystem}${retryInstruction}` }, { role: "user", content: JSON.stringify({ ...executionInput, rejectedRevision: attempt ? revised : null, failedChecks: failureBrief }) }], 0.22, { timeoutMs: 25000, maxTokens: 2800, provider });
    revised = mergeScript(originalScript, rawRevision);
    revised.appliedActions = normalizeRevisionActions(rawRevision.appliedActions);
    revised.changeSummary = (Array.isArray(rawRevision.changeSummary) ? rawRevision.changeSummary : []).map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
    audits = await auditGoalRevision(originalScript, revised, diagnosis, input, revised.appliedActions);
    const passed = audits.factPreservationCheck.status === "PASS" && audits.conclusionPreservationCheck.status === "PASS" && audits.goalImprovementCheck.status === "PASS" && audits.goalImprovementCheck.overEdited !== true;
    if (passed) break;
  }
  const passed = audits.factPreservationCheck.status === "PASS" && audits.conclusionPreservationCheck.status === "PASS" && audits.goalImprovementCheck.status === "PASS" && audits.goalImprovementCheck.overEdited !== true;
  if (!passed) {
    const error = new Error("目标修订未通过事实、结论或互动改善检查，当前稿件已保留");
    error.code = "GOAL_REVISION_VALIDATION_FAILED";
    error.checks = audits;
    throw error;
  }
  return { ...revised, revisionDiagnosis: diagnosis, ...audits, changeSummary: revised.changeSummary.length ? revised.changeSummary : revised.appliedActions.filter((item) => item.action !== "KEEP").map((item) => `${item.location || "对应位置"}：${item.reason || item.action}`).slice(0, 4) };
}

async function applyAudienceEngagement(generated, input, provider) {
  const draft = { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] };
  const userEvidence = [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])].filter(Boolean);
  const contentType = input.confirmedDirection?.type || generated.contentType || "other";
  const plan = await llm([
    { role: "system", content: engagementPlanSystem },
    { role: "user", content: JSON.stringify({ contentType, duration: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion, userEvidence, draft }) },
  ], 0.15, { timeoutMs: 12000, maxTokens: 700, provider: "deepseek" });
  const engagementPlan = { moves: Array.isArray(plan.moves) ? plan.moves.filter((move) => ["PULL_IN", "INFORMATION_GAP", "EXPECTATION_TURN", "SHARED_RECOGNITION"].includes(move.type)).slice(0, 4) : [] };
  let engaged = await llm([
    { role: "system", content: audienceEngagementSystemStrict },
    { role: "user", content: JSON.stringify({ contentType, duration: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion, userEvidence, engagementPlan, draft }) },
  ], 0.3, { timeoutMs: 20000, maxTokens: 2200, provider });
  let candidate = mergeScript(generated, engaged);
  const bodyContainsMove = (result) => {
    const bodyText = (result.sections || []).filter((section) => String(section.text || "").trim() !== String(result.hook || "").trim()).map((section) => section.text || "").join("\n");
    return (result.appliedMoves || []).some((move) => {
      const surface = String(move.surfaceText || "").trim();
      return surface.length >= 4 && surface !== String(result.hook || "").trim() && bodyText.includes(surface) && !scriptText(draft).includes(surface);
    });
  };
  const firstPresence = assessAudiencePresence(candidate, contentType, input.duration);
  if (engagementPlan.moves.length && (firstPresence.status === "WEAK" || !bodyContainsMove(engaged))) {
    engaged = await llm([
      { role: "system", content: `${audienceEngagementSystemStrict}\n上次结果未通过 Audience Presence：动作只出现在 appliedMoves 元数据里，正文Hook之后仍是纯独白。本次必须在不新增含义的前提下，让至少一个计划动作真实体现在正文的信息释放节奏中；不能只改Hook，也不能只上报动作名称。` },
      { role: "user", content: JSON.stringify({ contentType, duration: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion, userEvidence, engagementPlan, rejectedDraft: engaged, failure: "正文没有可验证的surfaceText，动作不能只存在于元数据", draft }) },
    ], 0.25, { timeoutMs: 20000, maxTokens: 2200, provider });
    candidate = mergeScript(generated, engaged);
  }
  if (engagementPlan.moves.length && !bodyContainsMove(engaged) && input.adjustmentScope === "engagement") {
    engaged = await llm([
      { role: "system", content: `${audienceEngagementSystemStrict}\n这是一次保守局部编辑。必须逐字保留draft的标题、Hook、全部原句、段落数量和顺序，只在正文合适位置插入1到2个很短的Audience Move。不要重写、概括、删减或替换任何原句。surfaceText必须只填写新插入的句子。` },
      { role: "user", content: JSON.stringify({ contentType, duration: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion, userEvidence, engagementPlan, draft }) },
    ], 0.1, { timeoutMs: 20000, maxTokens: 2400, provider });
    candidate = mergeScript(generated, engaged);
  }
  if (engagementPlan.moves.length && !bodyContainsMove(engaged)) {
    const error = new Error("Audience Engagement 没有真正写入正文，请重新生成");
    error.code = "AUDIENCE_ENGAGEMENT_FAILED";
    throw error;
  }
  generated = candidate;
  generated.audienceOriginalText = scriptText(draft);
  generated.engagementPlan = engagementPlan;
  generated.appliedAudienceMoves = Array.isArray(engaged.appliedMoves) ? engaged.appliedMoves.slice(0, 4) : [];
  return generated;
}

async function applyFinalSpeakability(generated, input, provider) {
  const polished = await llm([
    { role: "system", content: finalSpeakabilitySystem },
    { role: "user", content: JSON.stringify({ confirmedUserConclusion: input.confirmedUserConclusion, audienceMoves: generated.appliedAudienceMoves || [], draft: { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] } }) },
  ], 0.15, { timeoutMs: 16000, maxTokens: 2200, provider });
  return mergeScript(generated, polished);
}

async function auditAudienceEngagement(generated, input) {
  const draft = { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] };
  const deterministicCheck = {
    mechanicalInteractionCheck: assessMechanicalInteraction(draft),
    audiencePresence: assessAudiencePresence(draft, generated.contentType, input.duration),
  };
  const audited = await llm([
    { role: "system", content: interactionAuditSystem },
    { role: "user", content: JSON.stringify({ contentType: generated.contentType || "other", duration: Number(input.duration || 60), confirmedUserConclusion: input.confirmedUserConclusion, userEvidence: [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])].filter(Boolean), engagementPlan: generated.engagementPlan || { moves: [] }, appliedAudienceMoves: generated.appliedAudienceMoves || [], deterministicCheck, draft }) },
  ], 0.05, { timeoutMs: 15000, maxTokens: 2200, provider: "deepseek" });
  generated = mergeScript(generated, audited.repairedScript);
  generated.mechanicalInteractionCheck = audited.mechanicalInteractionCheck || deterministicCheck.mechanicalInteractionCheck;
  generated.audiencePresence = audited.audiencePresence || deterministicCheck.audiencePresence;
  const finalMechanical = assessMechanicalInteraction(generated);
  const finalPresence = assessAudiencePresence(generated, generated.contentType, input.duration);
  if (finalMechanical.status === "FAIL") generated.mechanicalInteractionCheck = finalMechanical;
  if (finalPresence.status === "WEAK") generated.audiencePresence = finalPresence;
  return generated;
}

async function auditAndRepairAudienceEvidence(generated, input) {
  const auditInput = { userEvidence: [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])].filter(Boolean), confirmedUserConclusion: input.confirmedUserConclusion, draft: { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] } };
  let audit = await llm([{ role: "system", content: audienceEvidenceAuditSystem }, { role: "user", content: JSON.stringify(auditInput) }], 0.02, { timeoutMs: 12000, maxTokens: 900, provider: "deepseek" });
  if (audit.status === "FAIL" && audit.unsupportedClaims?.length) {
    const repaired = await llm([{ role: "system", content: audienceEvidenceRepairSystem }, { role: "user", content: JSON.stringify({ ...auditInput, unsupportedClaims: audit.unsupportedClaims }) }], 0.05, { timeoutMs: 15000, maxTokens: 2000, provider: "deepseek" });
    generated = mergeScript(generated, repaired);
    audit = await llm([{ role: "system", content: audienceEvidenceAuditSystem }, { role: "user", content: JSON.stringify({ ...auditInput, draft: { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] } }) }], 0.02, { timeoutMs: 12000, maxTokens: 900, provider: "deepseek" });
  }
  generated.audienceEvidenceCheck = { status: audit.status === "FAIL" ? "FAIL" : "PASS", unsupportedClaims: audit.unsupportedClaims || [] };
  return generated;
}

async function groundScript(generated, input, provider = "deepseek") {
  const timeoutMs = Math.max(1000, Math.min(10000, Number(process.env.GROUNDING_TIMEOUT_SECONDS || 8) * 1000));
  const reviewed = await llm([
    { role: "system", content: groundingSystem },
    { role: "user", content: JSON.stringify({ sourceMaterial: input.currentMaterial || "", followUpAnswer: input.followUpAnswer || "", confirmedUserConclusion: input.confirmedUserConclusion, creativePreferences: input.creativePreferences || {}, contentType: generated.contentType, coreMoment: generated.coreMoment, qualityGates: generated.qualityGates, preflightIssues: generated.preflightIssues, audienceMoves: generated.appliedAudienceMoves || [], draft: { hook: generated.hook, sections: generated.sections } }) },
  ], 0.1, { timeoutMs, maxTokens: 1800, provider });
  generated.groundingCheck = { passed: reviewed.passed === true, issues: Array.isArray(reviewed.issues) ? reviewed.issues : [] };
  generated.hook = String(reviewed.hook || generated.hook || "");
  generated.sections = Array.isArray(reviewed.sections) && reviewed.sections.length ? reviewed.sections : generated.sections;
  const source = `${input.currentMaterial || ""}\n${input.followUpAnswer || ""}`;
  const soften = (text) => {
    let value = String(text || "");
    if (!/从来/.test(source)) value = value.replace(/从来不/g, "不").replace(/从来没有/g, "没有");
    if (!/一直/.test(source)) value = value.replace(/一直/g, "");
    if (!/完全/.test(source)) value = value.replace(/完全/g, "");
    return value.replace(/\s{2,}/g, " ").trim();
  };
  generated.hook = soften(generated.hook);
  generated.sections = (generated.sections || []).map((section) => ({ ...section, text: soften(section.text) }));
  return generated;
}

function framingItems(framing = {}) {
  return [...new Set([...(framing.concepts || []), ...(framing.phrases || []), ...(framing.metaphors || []), ...(framing.labels || []), ...(framing.rhetoricalFrames || [])].map((item) => String(item).trim()).filter(Boolean))];
}

async function checkAndRepairFraming(generated, input) {
  const sourceDistinctiveFraming = input.confirmedStrategy?.sourceDistinctiveFraming || input.sourceDistinctiveFraming || {};
  if (!framingItems(sourceDistinctiveFraming).length || input.userApprovedSourceFraming === true) {
    generated.framingLeakageCheck = { status: "PASS", leaks: [] };
    return generated;
  }
  const auditInput = { sourceDistinctiveFraming, topicCommonWords: input.topicCommonWords || [], userApprovedSourceFraming: false, confirmedUserConclusion: input.confirmedUserConclusion, userEvidence: input.confirmedStrategy?.supportingEvidence || [], script: { titles: generated.titles || [generated.title || ""], hook: generated.hook || "", sections: generated.sections || [] } };
  let check = await llm([{ role: "system", content: framingLeakageSystem }, { role: "user", content: JSON.stringify(auditInput) }], 0.05, { timeoutMs: 15000, maxTokens: 1000, provider: "deepseek" });
  check = { status: check.status === "FAIL" && Array.isArray(check.leaks) && check.leaks.length ? "FAIL" : "PASS", leaks: Array.isArray(check.leaks) ? check.leaks : [] };
  if (check.status === "FAIL") {
    const repaired = await llm([{ role: "system", content: framingRepairSystem }, { role: "user", content: JSON.stringify({ ...auditInput, leaks: check.leaks }) }], 0.25, { timeoutMs: 18000, maxTokens: 1800, provider: "deepseek" });
    const locations = new Set(check.leaks.map((item) => String(item.location || "").startsWith("title") ? "title" : String(item.location || "")));
    if (locations.has("title") && repaired.titles?.length) generated.titles = repaired.titles;
    if (locations.has("hook") && repaired.hook) generated.hook = repaired.hook;
    const lastIndex = Math.max(0, (generated.sections || []).length - 1);
    generated.sections = (generated.sections || []).map((section, index) => {
      const location = index === lastIndex ? "ending" : `section:${index}`;
      if (!locations.has(location) && !locations.has(`section:${index}`)) return section;
      return repaired.sections?.[index]?.text ? { ...section, text: repaired.sections[index].text } : section;
    });
    const finalAudit = await llm([{ role: "system", content: framingLeakageSystem }, { role: "user", content: JSON.stringify({ ...auditInput, script: { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] } }) }], 0.05, { timeoutMs: 15000, maxTokens: 1000, provider: "deepseek" });
    check = { status: finalAudit.status === "FAIL" && finalAudit.leaks?.length ? "FAIL" : "PASS", leaks: Array.isArray(finalAudit.leaks) ? finalAudit.leaks : [] };
  }
  generated.framingLeakageCheck = check;
  return generated;
}

async function checkContentDensity(generated, input) {
  const result = await llm([{ role: "system", content: contentDensitySystem }, { role: "user", content: JSON.stringify({ userEvidence: [input.currentMaterial, input.followUpAnswer, ...(input.confirmedStrategy?.supportingEvidence || [])].filter(Boolean), confirmedUserConclusion: input.confirmedUserConclusion, script: { titles: generated.titles || [], hook: generated.hook || "", sections: generated.sections || [] } }) }], 0.05, { timeoutMs: 15000, maxTokens: 1600, provider: "deepseek" });
  const check = { status: result.status === "FAIL" ? "FAIL" : "PASS", repeatedIdeas: result.repeatedIdeas || [], unsupportedExpansion: result.unsupportedExpansion || [], emptySummarySentences: result.emptySummarySentences || [], estimatedDurationSeconds: Number(result.estimatedDurationSeconds || estimatedSpeechSeconds(generated)), uniqueInformationUnits: Number(result.uniqueInformationUnits || 0) };
  if (check.status === "FAIL" && result.cleanedScript?.sections?.length) {
    generated.titles = result.cleanedScript.titles?.length ? result.cleanedScript.titles : generated.titles;
    generated.hook = result.cleanedScript.hook || generated.hook;
    generated.sections = result.cleanedScript.sections;
    check.status = "PASS";
    check.repaired = true;
  }
  generated.contentDensityCheck = check;
  return generated;
}

function miningQuestionFor(missingDimensions = []) {
  const templates = {
    "Concrete Moment": "当时有没有一个你至今记得的具体表现或瞬间？如果没有也可以直接说没有。",
    Conflict: "这件事里最不符合你预期的地方是什么？如果没有明显冲突也可以直接说没有。",
    Consequence: "这件事实际造成了什么结果或影响？只说真实发生的；没有明确结果也可以说没有。",
    Change: "那次之后再遇到类似情况，你有没有真的改变过做法？如果有，具体做了什么；没有也可以直接说没有。",
    "Result After Change": "如果你后来改变过做法，实际结果有什么不同？没有改变或没有结果也可以直接说没有。",
    "Boundary / Counterexample": "这个判断有没有不适用的情况，或者你见过的反例？没有也可以直接说没有。",
    "反例 / 边界": "这个观点有没有不适用的情况，或者真实反例？没有也可以直接说没有。",
    限制: "实际使用中有没有遇到明确限制或不适用的情况？没有也可以直接说没有。",
    常见坑: "你实际遇到过最容易出错的一步是什么？没有也可以直接说没有。",
  };
  const key = missingDimensions.find((dimension) => templates[dimension]);
  return templates[key] || "目前最缺的是一个具体细节：有没有一个你印象深的真实表现、动作或结果？没有也可以直接说没有。";
}

function publicScript(generated) {
  const hook = String(generated.hook || "").trim();
  const sections = (Array.isArray(generated.sections) ? generated.sections : []).map((section) => ({ ...section, text: String(section.text || "").trim() })).filter((section) => section.text);
  if (sections[0] && hook) {
    if (sections[0].text === hook) sections.shift();
    else if (sections[0].text.startsWith(hook)) sections[0].text = sections[0].text.slice(hook.length).trim();
  }
  return {
    titles: Array.isArray(generated.titles) ? generated.titles.slice(0, 3) : [],
    hook,
    sections: sections.filter((section) => section.text),
    explanation: {
      borrowed: Array.isArray(generated.explanation?.borrowed) ? generated.explanation.borrowed : (generated.reusableMechanisms || []),
      usedUserMaterial: Array.isArray(generated.explanation?.usedUserMaterial) ? generated.explanation.usedUserMaterial : [],
    },
    changeSummary: Array.isArray(generated.changeSummary) ? generated.changeSummary.slice(0, 5) : [],
    appliedActions: normalizeRevisionActions(generated.appliedActions),
    evidenceReferences: (generated.evidenceReferences || []).filter((item) => item?.type === "EXTERNAL_EVIDENCE" && item.userConfirmed === true).slice(0, 10),
  };
}

function selfCheckFailed(generated) {
  const gateFailed = Object.values(generated.qualityGates || {}).some((value) => /^FAIL_/.test(String(value)));
  return gateFailed
    || generated.contentSufficiencyCheck?.status === "UNDER_EXPANDED"
    || generated.duplicateFactCheck?.passed === false
    || generated.informationProgressionCheck?.passed === false
    || Object.values(generated.selfCheck || {}).some((value) => value === true);
}

function visibleScriptLength(generated) {
  const sections = Array.isArray(generated.sections) ? generated.sections : [];
  const bodySections = sections[0]?.text?.trim() === String(generated.hook || "").trim() ? sections.slice(1) : sections;
  const body = bodySections.map((section) => section.text || "").join("");
  return `${generated.hook || ""}${body}`.replace(/\s+/g, "").length;
}

function durationBounds(duration) {
  const seconds = Number(duration || 60);
  const targetChars = seconds * 4;
  return { minChars: Math.round(targetChars * 0.9), maxChars: Math.round(targetChars * 1.1) };
}

function estimatedSpeechSeconds(generated) {
  return Math.round(visibleScriptLength(generated) / 4);
}

function hasRichNarrative(generated) {
  if (!["story", "experience", "mixed", "case"].includes(generated.contentType)) return false;
  const units = generated.contentUnits || {};
  const usedGroups = ["background", "previousBelief", "triggerEvent", "process", "difficulty", "action", "result", "realization"]
    .filter((key) => Array.isArray(units[key]) && units[key].length > 0);
  return usedGroups.length >= 5 && (units.process || []).length >= 2;
}

function repeatsHookResult(generated) {
  const hook = String(generated.hook || "");
  const sections = generated.sections || [];
  const bodySections = sections[0]?.text?.trim() === hook.trim() ? sections.slice(1) : sections;
  const body = bodySections.map((section) => section.text || "").join(" ");
  const resultMarkers = [/网站.{0,6}跑起来/, /做出.{0,8}网站/, /产品.{0,6}跑起来/, /最终.{0,8}完成/];
  return resultMarkers.some((pattern) => pattern.test(hook) && pattern.test(body));
}

function removeUnauthorizedCta(generated, input) {
  const preference = String(input.creativePreferences?.ctaPreference || "不主动号召");
  if (/CTA|号召|关注|评论|收藏|转发/i.test(String(input.adjustment || "")) || preference === "明确行动号召") return generated;
  const sections = Array.isArray(generated.sections) ? generated.sections : [];
  const last = sections.at(-1);
  if (preference === "自然邀请讨论") {
    if (last) last.text = String(last.text || "").replace(/(?:点赞|收藏|转发|关注)(?:一下|我|起来)?[，、和 ]*/g, "").trim();
    return generated;
  }
  if (last && /如果你也|你也可以|可以试试|不妨试试|关注|评论区|收藏|转发/.test(String(last.text || ""))) sections.pop();
  return generated;
}

function removeUnsupportedAdvice(generated, input) {
  const evidence = `${input.currentMaterial || ""}\n${input.followUpAnswer || ""}\n${(input.confirmedStrategy?.supportingEvidence || []).join("\n")}`;
  const advicePattern = /与其.{0,50}不如|你(?:应该|可以|需要)|建议(?:你|大家)?|不妨|先明确|守住它|最好的做法|我原来.{0,20}(?:这么想|也以为)|这样.{0,20}(?:顺利|成功|改善|提升|变得更好)/;
  let removed = false;
  generated.sections = (generated.sections || []).map((section) => {
    const sentences = String(section.text || "").match(/[^。！？!?]+[。！？!?]?/g) || [];
    const kept = sentences.filter((sentence) => {
      const match = sentence.match(advicePattern)?.[0];
      if (!match || evidence.includes(match)) return true;
      removed = true;
      return false;
    });
    return { ...section, text: kept.join("").trim() };
  }).filter((section) => section.text);
  if (removed) {
    const conclusion = String(input.confirmedUserConclusion || "").trim();
    const current = scriptText(generated);
    if (conclusion && !current.includes(conclusion)) {
      const last = generated.sections.at(-1);
      if (last) last.text = `${last.text}${/[。！？!?]$/.test(last.text) ? "" : "。"}${conclusion}`;
    }
    generated.unsupportedAdviceRemoved = true;
  }
  return generated;
}

function forbiddenExpressionHits(generated, input) {
  const terms = String(input.creativePreferences?.forbiddenExpressions || "")
    .split(/[，,、；;\n]+/).map((term) => term.trim()).filter((term) => term.length >= 2).slice(0, 30);
  const text = `${(generated.titles || []).join("\n")}\n${scriptText(generated)}`;
  return terms.filter((term) => text.includes(term));
}

function applyFinalSufficiency(generated, input) {
  const check = generated.contentSufficiencyCheck || {};
  const length = visibleScriptLength(generated);
  const bounds = durationBounds(input.duration);
  check.estimatedSeconds = estimatedSpeechSeconds(generated);
  check.acceptableSeconds = [0, Math.round(Number(input.duration || 60) * 1.1)];
  check.durationFit = length <= bounds.maxChars;
  if (length > bounds.maxChars) check.status = "OVER_EXPANDED";
  else if (check.status === "UNDER_EXPANDED") check.status = "PASS";
  generated.contentSufficiencyCheck = check;
  return generated;
}

async function api(req, res) {
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }); return res.end(); }
    const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (requestUrl.pathname === "/api/public-config" && req.method === "GET") return send(res, 200, { supabase: supabaseConfigured() ? supabaseConfig() : null });
    if (requestUrl.pathname === "/api/auth/me" && req.method === "GET") return send(res, 200, { user: await supabaseUser(req) });
    const publicApi = requestUrl.pathname === "/api/health" || requestUrl.pathname === "/api/import-browser-post";
    if (supabaseConfigured() && !publicApi) req.authUser = await supabaseUser(req);
    if (requestUrl.pathname === "/api/extension-token" && req.method === "POST") {
      const input = await body(req);
      const created = await supabaseRpc("create_extension_token", { token_name: String(input.name || "默认浏览器").slice(0, 80) }, String(req.headers.authorization || ""));
      return send(res, 201, { ok: true, token: created?.[0] || null });
    }
    if (req.url === "/api/health" && req.method === "GET") return send(res, 200, { ok: true, aiConfigured: Boolean(process.env.LLM_API_KEY && process.env.LLM_MODEL), doubaoConfigured: Boolean(process.env.DOUBAO_API_KEY && process.env.DOUBAO_MODEL), asrConfigured: asrConfigured(), asrProvider: configuredAsrProvider() });
    if (requestUrl.pathname === "/api/recordings/convert" && req.method === "POST") {
      const contentType = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
      if (!contentType.startsWith("video/")) return send(res, 415, { ok: false, code: "RECORDING_TYPE_UNSUPPORTED", error: "只能转换视频录像" });
      const extension = contentType === "video/mp4" ? ".mp4" : contentType === "video/quicktime" ? ".mov" : ".webm";
      const input = await rawBody(req, Number(process.env.RECORDING_MAX_MB || 512) * 1024 * 1024);
      if (input.length < 1024) return send(res, 422, { ok: false, code: "RECORDING_EMPTY", error: "录像文件为空或不完整" });
      const mp4 = contentType === "video/mp4" ? input : await convertRecordingBufferToMp4(input, extension);
      const requestedName = String(requestUrl.searchParams.get("name") || "口播录像").replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 120) || "口播录像";
      res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": mp4.length, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${requestedName}.mp4`)}`, "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
      return res.end(mp4);
    }
    if (requestUrl.pathname === "/api/recording-assets" && req.method === "POST") {
      const contentType = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
      if (contentType !== "video/mp4") return send(res, 415, { ok: false, error: "剪辑原片需要是 MP4" });
      const buffer = await rawBody(req, Number(process.env.RECORDING_MAX_MB || 512) * 1024 * 1024);
      if (buffer.length < 1024) return send(res, 422, { ok: false, error: "录像文件为空或不完整" });
      const id = crypto.randomUUID();
      const file = path.join(RECORDING_ASSETS, `${id}.mp4`);
      fs.writeFileSync(file, buffer);
      recordingAssets.set(id, { id, path: file, size: buffer.length, createdAt: Date.now() });
      return send(res, 201, { ok: true, asset: { id, size: buffer.length } });
    }
    if (requestUrl.pathname === "/api/recording-edit-jobs" && req.method === "POST") {
      const input = await body(req);
      const asset = recordingAssets.get(String(input.assetId || ""));
      if (!asset || !fs.existsSync(asset.path)) return send(res, 404, { ok: false, error: "剪辑原片不存在，请重新拍摄" });
      const job = startRecordingEditJob({ sourcePath: asset.path, trimStart: input.trimStart, trimEnd: input.trimEnd, volume: input.volume, template: input.template, captionText: String(input.captionText || "").slice(0, 5000), highlightKeywords: input.highlightKeywords !== false, introTitle: String(input.introTitle || "").slice(0, 80), outroText: String(input.outroText || "").slice(0, 60) });
      return send(res, 202, { ok: true, job });
    }
    if (requestUrl.pathname === "/api/recording-edit-jobs" && req.method === "GET") {
      const job = recordingEditJobs.get(requestUrl.searchParams.get("id"));
      if (!job) return send(res, 404, { ok: false, error: "剪辑任务不存在或服务已重启" });
      const statusFile = path.join(RECORDING_EDIT_JOBS, job.id, "status.json");
      if (job.status === "running" && fs.existsSync(statusFile)) { try { Object.assign(job, JSON.parse(fs.readFileSync(statusFile, "utf8"))); } catch {} }
      return send(res, 200, { ok: true, job });
    }
    if (requestUrl.pathname === "/api/transcribe-audio" && req.method === "POST") {
      const input = await body(req);
      const encoded = String(input.audioBase64 || "");
      if (!encoded) return send(res, 422, { ok: false, error: "没有收到录音内容", code: "AUDIO_EMPTY" });
      const audioBytes = Buffer.from(encoded, "base64");
      if (audioBytes.length < 1500) return send(res, 422, { ok: false, error: "录音太短，请说完一句话后再停止", code: "AUDIO_TOO_SHORT" });
      const extension = { "audio/webm": ".webm", "audio/wav": ".wav", "audio/mp4": ".m4a", "audio/ogg": ".ogg", "audio/mpeg": ".mp3" }[String(input.mimeType || "").split(";")[0]] || ".webm";
      const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-dictation-"));
      const audioFile = path.join(directory, `recording${extension}`);
      try {
        await fs.promises.writeFile(audioFile, audioBytes);
        const vocabulary = Array.isArray(input.contextVocabulary) ? input.contextVocabulary.map(String).slice(0, 30) : [];
        let transcription;
        try {
          transcription = process.env.LOCAL_ASR_ENABLED === "false"
            ? process.env.GROQ_API_KEY ? await transcribeFileWithGroq(audioFile) : await transcribeLocalAudioWithDashScope(audioFile, { vocabulary })
            : await transcribeLocalAudioWithFunASR(audioFile, { vocabulary });
        } catch (error) {
          if (process.env.LOCAL_ASR_FALLBACK_CLOUD === "true" && process.env.DASHSCOPE_API_KEY) transcription = await transcribeLocalAudioWithDashScope(audioFile, { vocabulary });
          else throw error;
        }
        const rawTranscript = String(transcription?.text || "").trim();
        if (!rawTranscript) return send(res, 422, { ok: false, error: "没有识别到有效内容，请检查麦克风后再试", code: "TRANSCRIPTION_EMPTY" });
        const normalized = await normalizeTranscript(rawTranscript, vocabulary);
        const segments = (transcription.segments || []).map((segment) => ({ ...segment, lowConfidence: segment.confidence != null && segment.confidence < 0.65 }));
        return send(res, 200, { ok: true, text: normalized.text, rawTranscript, normalizedTranscript: normalized.text, structuredEvidence: null, segments, duration: transcription.duration, uncertainTerms: normalized.uncertainTerms, normalizationStatus: normalized.status, normalizationError: normalized.error || "" });
      } finally {
        await fs.promises.rm(directory, { recursive: true, force: true }).catch(() => {});
      }
    }
    if (requestUrl.pathname === "/api/source/parse" && req.method === "POST") {
      if (!checkSourceRateLimit(req)) return send(res, 429, { error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" });
      const input = await body(req);
      const { platform, url } = detectPlatform(String(input.url || "").trim());
      const projectId = crypto.randomUUID();
      const job = { projectId, platform, status: "parsing", progress: 0, source: null, transcript: null, evidence: null, analysis: null, error: null, createdAt: Date.now() };
      sourceParseJobs.set(projectId, job);
      runSourceParseJob(job, getProvider(platform), url);
      return send(res, 202, { projectId, platform, status: "parsing" });
    }
    if (requestUrl.pathname.startsWith("/api/source/parse/") && req.method === "GET") {
      const projectId = decodeURIComponent(requestUrl.pathname.slice("/api/source/parse/".length));
      const job = sourceParseJobs.get(projectId);
      if (!job) return send(res, 404, { status: "failed", progress: 0, source: {}, transcript: [], evidence: {}, error: { code: "PROJECT_NOT_FOUND", message: "解析任务不存在或服务已重启" } });
      return send(res, 200, sourceJobView(job));
    }
    if (requestUrl.pathname === "/api/video-assets" && req.method === "POST") {
      const originalName = requestUrl.searchParams.get("name") || "asset";
      const type = String(req.headers["content-type"] || "").split(";")[0];
      const extension = safeAssetExtension(type, originalName);
      if (!extension) return send(res, 415, { ok: false, error: "仅支持 JPG、PNG、WebP、MP4、WebM 或 MOV 素材" });
      const id = crypto.randomUUID(); const buffer = await rawBody(req); const file = path.join(VIDEO_ASSETS, `${id}${extension}`); fs.writeFileSync(file, buffer);
      return send(res, 200, { ok: true, asset: { id, name: path.basename(originalName).slice(0, 160), type, path: file, size: buffer.length } });
    }
    if (requestUrl.pathname === "/api/video-jobs" && req.method === "POST") {
      const input = await body(req);
      if (!input.script?.hook) return send(res, 422, { ok: false, error: "请先生成口播稿" });
      const job = startVideoJob({ script: input.script, assets: (input.assets || []).slice(0, 12), targetDuration: Math.max(54, Math.min(66, Number(input.targetDuration || 60))) });
      return send(res, 202, { ok: true, job });
    }
    if (requestUrl.pathname === "/api/video-jobs" && req.method === "GET") {
      const job = videoJobs.get(requestUrl.searchParams.get("id"));
      if (!job) return send(res, 404, { ok: false, error: "生成任务不存在或服务已重启" });
      const statusFile = path.join(VIDEO_JOBS, job.id, "status.json");
      if (job.status === "running" && fs.existsSync(statusFile)) { try { Object.assign(job, JSON.parse(fs.readFileSync(statusFile, "utf8"))); } catch {} }
      return send(res, 200, { ok: true, job });
    }
    if (req.url === "/api/parse-link" && req.method === "POST") {
      const url = (await body(req)).url;
      try { return send(res, 200, { ok: true, case: await parseWithManagedBrowser(url) }); }
      catch (browserError) {
        if (browserError.code === "SECURITY_VERIFICATION_REQUIRED") throw browserError;
        try {
          const basic = await parsePublicPost(url);
          basic.sourceStatus.browserError = friendlyCollectionError(browserError);
          basic.sourceStatus.browserErrorCode = browserError.code || "COLLECTION_FAILED";
          return send(res, 200, { ok: true, case: basic, degraded: true });
        } catch {
          const error = new Error(friendlyCollectionError(browserError));
          error.code = browserError.code || "COLLECTION_FAILED";
          throw error;
        }
      }
    }
    if (requestUrl.pathname === "/api/import-browser-post" && req.method === "POST") {
      const expectedToken = process.env.EXTENSION_IMPORT_TOKEN || "";
      const suppliedToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      let importUserId = null;
      if (supabaseConfigured() && suppliedToken && suppliedToken !== expectedToken) {
        try { importUserId = (await supabaseRpc("validate_extension_token", { candidate_token: suppliedToken }))?.[0]?.user_id || null; }
        catch {}
      }
      const legacyAuthorized = Boolean(expectedToken && suppliedToken === expectedToken);
      if (!legacyAuthorized && !importUserId) return send(res, 401, { ok: false, code: "IMPORT_UNAUTHORIZED", error: "扩展连接码不正确或已失效" });
      const input = await body(req);
      if (!/^https?:\/\/(?:www\.)?(?:xiaohongshu\.com|xhslink\.com)\//i.test(input.url || "")) return send(res, 422, { ok: false, code: "INVALID_POST_URL", error: "只接受小红书帖子链接" });
      const text = String(input.content?.text || "").trim();
      if (!text && !input.content?.title) return send(res, 422, { ok: false, code: "CONTENT_INCOMPLETE", error: "当前页面没有提取到标题或正文" });
      const videoUrl = String(input.media?.videoUrl || "");
      const videoCandidates = [...new Set([videoUrl, ...(input.media?.videoCandidates || [])].map(String).filter((url) => url && !url.startsWith("blob:")))].slice(0, 8);
      const existingTranscript = String(input.content?.transcript || "").trim();
      const source = {
        platform: "xiaohongshu", url: input.url, contentType: input.contentType === "video" ? "video" : "image_text",
        author: { name: String(input.author?.name || "无法获取").slice(0, 100), followers: countValue(input.author?.followers) },
        metrics: { likes: countValue(input.metrics?.likes), collects: countValue(input.metrics?.collects), commentsCount: countValue(input.metrics?.commentsCount), shares: null },
        content: { title: String(input.content?.title || "").slice(0, 300), text: text.slice(0, 50000), transcript: existingTranscript.slice(0, 100000) },
        media: { videoUrls: videoCandidates, videoCandidates, images: [] },
        videoAnalysis: null,
        sourceStatus: { fetchedAt: new Date().toISOString(), source: "browser_extension", fieldsAvailable: [input.content?.title && "title", text && "text", existingTranscript && "transcript", input.metrics?.likes !== "" && input.metrics?.likes != null && "likes", input.metrics?.collects !== "" && input.metrics?.collects != null && "collects", input.metrics?.commentsCount !== "" && input.metrics?.commentsCount != null && "commentsCount", input.comments?.length && "comments"].filter(Boolean), commentsCollected: Math.min((input.comments || []).length, 50), commentsExpected: countValue(input.metrics?.commentsCount), commentsComplete: false, commentsStopReason: "visible_sample_only", transcription: input.contentType === "video" ? existingTranscript ? "complete" : videoCandidates.length ? "queued" : "video_url_unavailable" : "not_needed", transcriptionError: "" },
      };
      let transcriptionJob = null;
      if (source.contentType === "video" && !existingTranscript && videoCandidates.length && asrConfigured()) {
        transcriptionJob = startTranscriptionJob(source);
        source.sourceStatus.transcriptionJobId = transcriptionJob.id;
        source.sourceStatus.transcription = "processing";
      }
      const importId = crypto.randomUUID();
      browserImports.set(importId, { source, userId: importUserId, expiresAt: Date.now() + 30 * 60 * 1000 });
      return send(res, 200, { ok: true, importId, transcriptionJobId: transcriptionJob?.id || null, expiresInSeconds: 1800 });
    }
    if (requestUrl.pathname === "/api/browser-import" && req.method === "GET") {
      const entry = browserImports.get(requestUrl.searchParams.get("id"));
      if (!entry || entry.expiresAt < Date.now()) return send(res, 404, { ok: false, code: "IMPORT_EXPIRED", error: "这次浏览器导入已过期，请回到原帖重新发送" });
      if (entry.userId && entry.userId !== req.authUser?.id) return send(res, 403, { ok: false, code: "IMPORT_FORBIDDEN", error: "这条扩展导入不属于当前账号" });
      browserImports.delete(requestUrl.searchParams.get("id"));
      return send(res, 200, { ok: true, case: entry.source });
    }
    if (requestUrl.pathname === "/api/retranscribe" && req.method === "POST") {
      const input = await body(req);
      const source = input.case || {};
      const videoUrl = String(source.media?.videoUrls?.[0] || "");
      if (!videoUrl) return send(res, 422, { ok: false, code: "VIDEO_SOURCE_UNAVAILABLE", error: "原视频地址未获取或已失效，请回到原帖重新采集" });
      if (!asrConfigured()) return send(res, 503, { ok: false, code: "ASR_NOT_CONFIGURED", error: "逐字稿服务尚未配置" });
      const transcription = await transcribeVideo(videoUrl);
      if (!String(transcription?.text || "").trim()) return send(res, 422, { ok: false, code: "TRANSCRIPTION_EMPTY", error: "本次仍未识别到有效逐字稿，请回到原帖重新采集" });
      source.content = { ...(source.content || {}), transcript: String(transcription.text).slice(0, 100000) };
      source.videoAnalysis = { duration: transcription.duration, segments: transcription.segments || [] };
      source.sourceStatus = {
        ...(source.sourceStatus || {}), transcription: "complete", transcriptionError: "",
        transcriptionProvider: transcription.provider || configuredAsrProvider(),
        fieldsAvailable: [...new Set([...(source.sourceStatus?.fieldsAvailable || []), "transcript"])],
      };
      return send(res, 200, { ok: true, case: source });
    }
    if (requestUrl.pathname === "/api/transcription-jobs" && req.method === "POST") {
      if (!asrConfigured()) return send(res, 503, { ok: false, code: "ASR_NOT_CONFIGURED", error: "逐字稿服务尚未配置" });
      const input = await body(req);
      const job = startTranscriptionJob(input.case || {});
      return send(res, 202, { ok: true, job: { id: job.id, status: job.status, stage: job.stage } });
    }
    if (requestUrl.pathname === "/api/transcription-jobs" && req.method === "GET") {
      const job = transcriptionJobs.get(requestUrl.searchParams.get("id"));
      if (!job) return send(res, 404, { ok: false, code: "TRANSCRIPTION_JOB_NOT_FOUND", error: "逐字稿任务不存在或服务已重启" });
      return send(res, 200, { ok: true, job: { id: job.id, status: job.status, stage: job.stage, progress: job.progress, attempts: job.attempts, case: job.source, error: job.error } });
    }
    if (req.url === "/api/analyze" && req.method === "POST") {
      const input = await body(req);
      const isVideo = input.case?.contentType === "video";
      const transcript = String(input.case?.content?.transcript || "").trim();
      const articleText = String(input.case?.content?.text || "").trim();
      if (isVideo && !transcript) {
        return send(res, 422, { ok: false, code: "TRANSCRIPT_REQUIRED", error: "未取得逐字稿，分析条件不足，已停止后续生成" });
      }
      if (!isVideo && articleText.length < 30) return send(res, 422, { ok: false, code: "ARTICLE_TEXT_REQUIRED", error: "未取得完整图文原稿，分析条件不足" });
      const compact = analysisInput(input.case || {});
      const key = stableHash(compact);
      const cached = analysisCache.get(key);
      if (cached) return send(res, 200, { ok: true, analysis: cached, meta: { cacheHit: true, durationMs: 0 } });
      const started = Date.now();
      const analysis = await llm([{ role: "system", content: analysisSystem }, { role: "user", content: JSON.stringify(compact) }], 0.3);
      analysisCache.set(key, analysis);
      return send(res, 200, { ok: true, analysis, meta: { cacheHit: false, durationMs: Date.now() - started } });
    }
    if (req.url === "/api/completeness" && req.method === "POST") {
      const input = await body(req);
      const cacheKey = stableHash(input);
      if (completenessCache.has(cacheKey)) return send(res, 200, { ok: true, ...completenessCache.get(cacheKey), meta: { cacheHit: true, durationMs: 0 } });
      const started = Date.now();
      const verdict = await llm([{ role: "system", content: completenessSystem }, { role: "user", content: JSON.stringify(input) }], 0.2);
      const momentOverride = verdict.sufficient === false && hasExplicitMomentSignal(input);
      const tutorialOverride = verdict.sufficient === false && hasExplicitTutorialSignal(input);
      if (momentOverride || tutorialOverride) {
        verdict.sufficient = true;
        verdict.contentType = tutorialOverride ? "tutorial" : verdict.contentType;
        verdict.hasMoment = tutorialOverride ? false : true;
        verdict.question = "";
        verdict.missing = "";
        verdict.missingCriticalInfo = [];
      }
      completenessCache.set(cacheKey, verdict);
      return send(res, 200, { ok: true, ...verdict, meta: { cacheHit: false, durationMs: Date.now() - started, momentOverride, tutorialOverride } });
    }
    if (req.url === "/api/voice-dna" && req.method === "POST") {
      const input = await body(req);
      const sample = String(input.sample || "").slice(0, 6000);
      const cacheKey = stableHash(sample);
      if (creatorDnaCache.has(cacheKey)) return send(res, 200, { ok: true, voiceDNA: creatorDnaCache.get(cacheKey), meta: { cacheHit: true, durationMs: 0 } });
      const started = Date.now();
      const voiceDNA = await llm([{ role: "system", content: voiceSystem }, { role: "user", content: sample }], 0.2);
      creatorDnaCache.set(cacheKey, voiceDNA);
      return send(res, 200, { ok: true, voiceDNA, meta: { cacheHit: false, durationMs: Date.now() - started } });
    }
    if (req.url === "/api/rewrite-plan" && req.method === "POST") {
      const input = await body(req);
      const plan = await llm([{ role: "system", content: rewritePlanSystem }, { role: "user", content: JSON.stringify({ currentDraft: input.currentDraft || null, currentMaterial: String(input.currentMaterial || "").slice(0, 12000), followUpAnswer: String(input.followUpAnswer || "").slice(0, 4000), referenceMaterial: input.referenceMaterial || null, adjustment: String(input.adjustment || "").slice(0, 3000), adjustmentScope: input.adjustmentScope || "full" }) }], 0.15, { timeoutMs: 20000, maxTokens: 1200, provider: "deepseek" });
      return send(res, 200, { ok: true, plan });
    }
    if (req.url === "/api/content-editor/evidence-research" && req.method === "POST") {
      const input = await body(req);
      const gap = detectEvidenceGap({ currentMaterial: input.userStatement }, input.evidenceGap || {});
      if (!gap.researchable) return send(res, 422, { ok: false, code: "EVIDENCE_NOT_RESEARCHABLE", error: "这是个人经历缺口，需要你自己补充，不能通过网络查证" });
      console.log(`[evidence-event] evidence_research_clicked gapType=${gap.type}`);
      const result = await webResearch({ gap, userStatement: String(input.userStatement || "").slice(0, 3000), existingEvidence: (input.existingEvidence || []).slice(0, 20) });
      console.log(`[evidence-event] evidence_research_result gapType=${gap.type} count=${result.results.length}`);
      return send(res, 200, { ok: true, ...result });
    }
    if (req.url === "/api/content-editor/evidence-confirm" && req.method === "POST") {
      const input = await body(req);
      const confirmed = confirmEvidence(input.candidate || {}, input.confirmationType, input.userStatement);
      console.log(`[evidence-event] external_evidence_confirmed id=${confirmed.externalEvidence.id} memoryMatch=${Boolean(confirmed.memoryMatch)}`);
      return send(res, 200, { ok: true, ...confirmed });
    }
    if (req.url === "/api/content-editor/evidence-revise" && req.method === "POST") {
      const input = await body(req);
      const result = await runEvidenceRevision({ llm, currentScript: input.currentScript || {}, sectionIndex: input.sectionIndex, userEvidence: input.userEvidence || [], externalEvidence: input.externalEvidence || [], memoryMatch: input.memoryMatch || null, editorialPlan: input.editorialPlan || null, provider: "deepseek" });
      console.log(`[evidence-event] revision_with_external_evidence status=${result.validation?.status || "UNKNOWN"}`);
      return send(res, 200, { ok: true, ...result, script: publicScript(result.script) });
    }
    if (req.url === "/api/evidence-sufficiency" && req.method === "POST") {
      const input = await body(req);
      const prompt = { confirmedDirection: input.confirmedDirection || null, confirmedUserConclusion: input.confirmedUserConclusion || input.confirmedDirection?.userConclusion || "", userMaterial: String(input.userMaterial || "").slice(0, 8000), followUpAnswer: String(input.followUpAnswer || "").slice(0, 3000), requestedDurationSeconds: Number(input.requestedDurationSeconds || 60), creatorProfile: input.creatorProfile || {} };
      const result = await llm([{ role: "system", content: evidenceSufficiencySystem }, { role: "user", content: JSON.stringify(prompt) }], 0.1, { timeoutMs: 20000, maxTokens: 1800, provider: "deepseek" });
      const status = ["ENOUGH", "PARTIAL", "INSUFFICIENT"].includes(result.status) ? result.status : "PARTIAL";
      const recommended = Math.max(15, Math.min(90, Number(result.contentPotential?.recommendedDurationSeconds || 30)));
      const maxSafe = Math.max(recommended, Math.min(90, Number(result.contentPotential?.maxSafeDurationSeconds || recommended)));
      const hasConfirmedDirection = Boolean(prompt.confirmedDirection && prompt.confirmedUserConclusion);
      const followUpNeeded = hasConfirmedDirection && status !== "ENOUGH" && result.followUpNeeded !== false;
      const followUpQuestions = followUpNeeded ? [miningQuestionFor(result.missingDimensions || [])] : [];
      return send(res, 200, { ok: true, evidenceSufficiency: { ...result, status, contentPotential: { ...(result.contentPotential || {}), recommendedDurationSeconds: recommended, maxSafeDurationSeconds: maxSafe }, followUpNeeded, followUpQuestions } });
    }
    if (req.url === "/api/content-directions" && req.method === "POST") {
      const input = await body(req);
      const compact = {
        contentDNA: input.contentDNA || {},
        creatorProfile: input.creatorProfile || {},
        creatorMemory: Array.isArray(input.creatorMemory) ? input.creatorMemory.slice(0, 5) : [],
        userMaterial: String(input.userMaterial || "").slice(0, 6000),
        followUpAnswer: String(input.followUpAnswer || "").slice(0, 2000),
      };
      const result = await llm([{ role: "system", content: contentDirectionSystem }, { role: "user", content: JSON.stringify(compact) }], 0.35, { timeoutMs: 25000, maxTokens: 2200, provider: "deepseek" });
      const reviewed = await llm([{ role: "system", content: directionValidationSystem }, { role: "user", content: JSON.stringify({ userMaterial: compact.userMaterial, followUpAnswer: compact.followUpAnswer, creatorProfile: compact.creatorProfile, sourceDNA: result.sourceDNA || compact.contentDNA, creatorFit: result.creatorFit || {}, contentDirections: result.contentDirections || [] }) }], 0.1, { timeoutMs: 20000, maxTokens: 1800, provider: "deepseek" });
      let directions = Array.isArray(reviewed.contentDirections) ? reviewed.contentDirections.slice(0, 3) : [];
      const bundledDirection = directions.some((item) => /但|同时|以及|并且|不等于|不仅|而是|应该|只会|反而|与其/.test(String(item.userConclusion || item.coreIdea || "")));
      if (directions.length > 0 && directions.length < 3 && bundledDirection) {
        const split = await llm([{ role: "system", content: directionSplitSystem }, { role: "user", content: JSON.stringify({ userMaterial: compact.userMaterial, followUpAnswer: compact.followUpAnswer, contentDirections: directions }) }], 0.1, { timeoutMs: 18000, maxTokens: 1500, provider: "deepseek" });
        if (Array.isArray(split.contentDirections) && split.contentDirections.length >= directions.length) directions = split.contentDirections.slice(0, 3);
      }
      const evidenceText = `${compact.userMaterial}\n${compact.followUpAnswer}`;
      directions = directions.map((direction) => normalizeDirection(direction, evidenceText)).filter(Boolean);
      return send(res, 200, { ok: true, ...result, sourceDNA: result.sourceDNA || compact.contentDNA, contentDirections: directions, missingEvidence: reviewed.missingEvidence || result.missingEvidence || [], recommendation: reviewed.recommendation || result.recommendation || "", directionReview: { removed: reviewed.removed || [], conclusionIndependenceRequired: true, evidenceCoverageRequired: true } });
    }
    if (req.url === "/api/content-directions/merge" && req.method === "POST") {
      const input = await body(req);
      const result = await llm([{ role: "system", content: mergeDirectionSystem }, { role: "user", content: JSON.stringify({ directions: (input.directions || []).slice(0, 2), userMaterial: String(input.userMaterial || "").slice(0, 6000) }) }], 0.25, { timeoutMs: 20000, maxTokens: 1200, provider: "deepseek" });
      return send(res, 200, { ok: true, ...result });
    }
    if (req.url === "/api/rewrite-selection" && req.method === "POST") {
      const input = await body(req);
      const selectedText = String(input.selectedText || "").trim();
      if (!selectedText) return send(res, 422, { ok: false, error: "请先选择要修改的文字" });
      if (selectedText.length > 2000) return send(res, 422, { ok: false, error: "单次最多修改 2000 字" });
      if (!process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
        const replacementText = selectedText.replace(/总而言之|综上所述|值得注意的是|不可否认/g, "").replace(/[；;]/g, "。 ").replace(/，(?=.{20,})/g, "。 ").trim();
        return send(res, 200, { ok: true, replacementText: replacementText || selectedText, fallback: true });
      }
      const rewriteInput = { selectedText, reason: input.reason, userInstruction: String(input.userInstruction || "").slice(0, 2000), context: input.context && typeof input.context === "object" ? { previous: String(input.context.previous || "").slice(-800), current: String(input.context.current || "").slice(0, 1600), next: String(input.context.next || "").slice(0, 800), strategy: input.context.strategy || null } : {}, creatorDNA: input.creatorDNA || {} };
      let result = await llm([{ role: "system", content: selectionRewriteSystem }, { role: "user", content: JSON.stringify(rewriteInput) }], 0.35);
      let replacementText = String(result.replacementText || selectedText);
      let issues = selectionRewriteIssues(selectedText, replacementText, input.reason, input.userInstruction);
      if (issues.length) {
        result = await llm([{ role: "system", content: `${selectionRewriteSystem}\n上次结果未通过验收：${issues.join("；")}。必须修正这些问题。` }, { role: "user", content: JSON.stringify({ ...rewriteInput, rejectedReplacement: replacementText }) }], 0.25);
        replacementText = String(result.replacementText || selectedText);
        issues = selectionRewriteIssues(selectedText, replacementText, input.reason, input.userInstruction);
      }
      if (issues.length) return send(res, 422, { ok: false, error: `本次修改没有完全执行你的要求：${issues.join("；")}，请换一种说法重试。`, code: "REWRITE_VALIDATION_FAILED" });
      return send(res, 200, { ok: true, replacementText, validation: { passed: true } });
    }
    if (req.url === "/api/generate-variant" && req.method === "POST") {
      const input = await body(req);
      const mode = input.mode === "outline" ? "outline" : "spoken";
      if (!input.fullScript?.sections?.length) return send(res, 422, { ok: false, error: "缺少口播稿基础内容", code: "VARIANT_INPUT_MISSING" });
      const system = mode === "spoken" ? spokenSystem : outlineSystem;
      const prompt = { sourceMaterial: String(input.currentMaterial || "").slice(0, 12000), followUpAnswer: String(input.followUpAnswer || "").slice(0, 4000), confirmedStrategy: input.confirmedStrategy || null, creatorDNA: input.creatorDNA || {}, creativePreferences: input.creativePreferences || {}, fullScript: input.fullScript };
      let variant; let quality;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        variant = await llm([{ role: "system", content: `${system}${attempt ? "\n上次结果未通过质量检查，请严格按格式和差异要求重写。" : ""}` }, { role: "user", content: JSON.stringify(prompt) }], 0.45, { timeoutMs: 20000, maxTokens: 2200, provider: mode === "spoken" ? "doubao" : "deepseek" });
        quality = variantQuality(mode, variant, input.fullScript);
        if (quality.passed) break;
      }
      if (!quality?.passed) return send(res, 422, { ok: false, error: mode === "spoken" ? "自然口语版转换效果不足，请重试" : "提纲结构不完整，请重试", code: "VARIANT_QUALITY_FAILED" });
      return send(res, 200, { ok: true, mode, script: publicScript(variant), quality });
    }
    if (req.url === "/api/generate" && req.method === "POST") {
      const input = await body(req);
      const clientRequestId = String(input.clientRequestId || "").trim().slice(0, 120);
      const dedupeKey = clientRequestId ? `${req.socket.remoteAddress || "local"}:${clientRequestId}` : "";
      const existing = dedupeKey && generationRequests.get(dedupeKey);
      if (existing && Date.now() - existing.createdAt < 5 * 60 * 1000) {
        const cachedResult = await existing.promise;
        return send(res, 200, { ...cachedResult, meta: { ...cachedResult.meta, duplicateRequest: true } });
      }
      const generationContext = createGenerationContext(clientRequestId || crypto.randomUUID());
      const work = (async () => {
        if (input.previousDraft) {
          const edited = await runContentEditor({ llm, currentScript: input.previousDraft, input, provider: "deepseek", mode: "revision" });
          if (edited.needsEditorialInput) return { ok: true, script: publicScript(edited.script), needsEditorialInput: true, editorialQuestions: edited.editorialQuestions, revisionMemory: edited.revisionMemory, meta: { provider: "deepseek", pipeline: "content_editor", editMode: "content_editor", editorCallCount: edited.editorCallCount, executionPath: edited.executionPath, editorialDiagnosis: edited.editorialDiagnosis } };
          return { ok: true, script: publicScript(edited.script), revisionMemory: edited.revisionMemory, meta: { provider: "deepseek", pipeline: "content_editor", editMode: "content_editor", editorCallCount: edited.editorCallCount, executionPath: edited.executionPath, rebuiltStrategy: edited.rebuiltStrategy, editorialDiagnosis: edited.editorialDiagnosis, editorialValidation: edited.finalValidation, initialValidation: edited.initialValidation, finalValidation: edited.finalValidation, realDiff: edited.realDiff, verifiedAppliedActions: edited.verifiedAppliedActions, modelAppliedActions: edited.modelAppliedActions, repairAttempted: edited.repairAttempted, revisionRejected: edited.revisionRejected === true } };
        }
        const result = await runGenerationPipeline({ input, callLLM: callGenerationLLM, generationContext, strategyCache: generationStrategyCache });
        const usage = generationSummary(generationContext);
        return { ok: true, script: publicScript(result.script), strategy: result.strategy, judge: result.judge, finalJudge: result.finalJudge, meta: { provider: "deepseek", pipeline: "strategy_generate_unified_judge_conditional_fix", fixed: result.fixed, strategyCacheHit: result.strategyCacheHit, deterministicValidation: result.deterministic, ...usage } };
      })();
      if (dedupeKey) generationRequests.set(dedupeKey, { createdAt: Date.now(), promise: work });
      try { return send(res, 200, await work); }
      catch (error) { if (dedupeKey) generationRequests.delete(dedupeKey); throw error; }
      /* legacy pipeline retained below for reference; unreachable after the consolidated pipeline return */
      const provider = input.provider === "doubao" ? "doubao" : "deepseek";
      const compact = { duration: input.duration, contentStructure: input.contentStructure, viralMechanism: input.viralMechanism, transferableDNA: input.transferableDNA, identityDNA: input.identityDNA, creativePreferences: input.creativePreferences, voiceDNA: input.voiceDNA, creatorMemory: input.creatorMemory || [], adaptationMode: input.adaptationMode, referenceMaterial: input.referenceMaterial, previousDraft: input.previousDraft, currentMaterial: input.currentMaterial, followUpAnswer: input.followUpAnswer, audience: input.audience, adjustment: input.adjustment, adjustmentScope: input.adjustmentScope || "full", rewritePlan: input.rewritePlan || null, confirmedUserConclusion: input.confirmedUserConclusion || input.confirmedStrategy?.confirmedUserConclusion || null, confirmedDirection: input.confirmedDirection || null, confirmedStrategy: input.confirmedStrategy || null, sourceDistinctiveFraming: input.sourceDistinctiveFraming || input.confirmedStrategy?.sourceDistinctiveFraming || {}, topicCommonWords: input.topicCommonWords || [], userApprovedSourceFraming: input.userApprovedSourceFraming === true, revisionMemory: input.revisionMemory || {} };
      const started = Date.now();
      try {
        if (compact.previousDraft) {
          const edited = await runContentEditor({ llm, currentScript: compact.previousDraft, input: compact, provider, mode: "revision" });
          if (edited.needsEditorialInput) return send(res, 200, { ok: true, needsEditorialInput: true, editorialQuestions: edited.editorialQuestions, revisionMemory: edited.revisionMemory, meta: { provider, editMode: "content_editor", durationMs: Date.now() - started, editorCallCount: edited.editorCallCount, editorialDiagnosis: edited.editorialDiagnosis } });
          const generated = edited.script;
          const finalLength = visibleScriptLength(generated);
          return send(res, 200, { ok: true, script: publicScript(generated), revisionMemory: edited.revisionMemory, meta: { provider, editMode: "content_editor", durationMs: Date.now() - started, inputChars: JSON.stringify(compact).length, outputChars: finalLength, estimatedSeconds: estimatedSpeechSeconds(generated), targetDuration: Number(compact.duration || 60), editorCallCount: edited.editorCallCount, editorialDiagnosis: edited.editorialDiagnosis, editorialValidation: edited.finalValidation, initialValidation: edited.initialValidation, finalValidation: edited.finalValidation, realDiff: edited.realDiff, verifiedAppliedActions: edited.verifiedAppliedActions, modelAppliedActions: edited.modelAppliedActions, repairAttempted: edited.repairAttempted, revisionRejected: edited.revisionRejected === true } });
        }
        const baseSystem = compact.adaptationMode === "reference_rebuild" ? referenceRebuildSystem : provider === "doubao" ? doubaoFullSystem : generationSystem;
        const fullSystem = `${baseSystem}\nconfirmedUserConclusion 是本稿唯一允许的结论，必须优先于其他输入；confirmedDirection、confirmedStrategy、supportingEvidence和用户素材只用于把它讲清楚。来源结论一律标记为 REFERENCE_ONLY_DO_NOT_COPY_CONCLUSION。sourceDistinctiveFraming一律标记为SOURCE_FRAMING_DO_NOT_REUSE：除非userApprovedSourceFraming=true，否则标题、Hook、正文、结尾都禁止直接使用或同义复刻其中的独特概念、标签、比喻、短语与修辞框架；普通Topic词不受限。标题只能由用户Evidence与confirmedUserConclusion解释；Hook优先来自用户Moment/Conflict/Insight；结尾回到用户自己的认知。禁止回到来源答案、用用户案例证明来源观点或为了爆款感恢复来源包装。referenceMaterial不可重新分析或提取答案。若没有通过Conclusion Independence、Framing Independence与Evidence Coverage，不得生成。禁止制造结果、强行升华、强行CTA或教育观众。如果存在 rewritePlan，必须逐项执行其中的 mustKeep、mustChange、mustAvoid 和 acceptanceChecks。adjustmentScope=hook 时只允许改变标题与Hook；adjustmentScope=ending 时只允许改变最后一段；其他正文必须保持。用户 adjustment 的明确要求高于一般风格偏好。`;
        const engagementConstraint = compact.adjustmentScope === "engagement" ? `\n本次是对 previousDraft 的“只增加互动感”修改，不是重新写稿。previousDraft 是唯一底稿：标题、Hook中的事实、每段事实、观点、段落顺序、核心措辞和结论必须保留。只允许在合适位置插入极少量 Audience Move，或为承接互动调整相邻一句；不得换案例、换方法、换结论、概括掉素材、删除段落或把用户经历改成另一套内容。输出长度应接近原稿。` : "";
        const densityAwareSystem = `${fullSystem}${engagementConstraint}\n最终稿必须直接是自然口语版：用户第一次看到就能顺着说下来；一句尽量只承载一个主要意思，按自然语义拆句，删除书面连接词和AI总结腔，不刻意堆“就是、然后、其实”等语气词。目标不是达到指定字数，而是把已有真实内容讲完整后立即停止。duration是上限而不是必须填满的指标。禁止为了时长重复观点、换词复述Evidence、增加空泛总结或升华、编造情绪/变化/案例/结果、添加无证据行动建议。素材只够更短内容时直接输出更短稿。`;
        let generated = await llm([{ role: "system", content: densityAwareSystem }, { role: "user", content: JSON.stringify(compact) }], 0.62, { timeoutMs: 30000, maxTokens: provider === "doubao" ? 2200 : 4096, provider });
        generated = applyAdjustmentScope(generated, compact.previousDraft, compact.adjustmentScope);
        let rewriteIssues = wholeRewriteIssues(compact.previousDraft, generated, compact.adjustment, compact.adjustmentScope);
        if (compact.adjustmentScope === "engagement") rewriteIssues = rewriteIssues.filter((issue) => issue !== "没有产生实质修改");
        if (rewriteIssues.length) {
          generated = await llm([{ role: "system", content: `${densityAwareSystem}\n上次结果未通过用户要求验收：${rewriteIssues.join("；")}。本次必须逐项修正。` }, { role: "user", content: JSON.stringify({ ...compact, rejectedDraft: generated }) }], 0.42, { timeoutMs: 30000, maxTokens: provider === "doubao" ? 2200 : 4096, provider });
          generated = applyAdjustmentScope(generated, compact.previousDraft, compact.adjustmentScope);
          rewriteIssues = wholeRewriteIssues(compact.previousDraft, generated, compact.adjustment, compact.adjustmentScope);
          if (compact.adjustmentScope === "engagement") rewriteIssues = rewriteIssues.filter((issue) => issue !== "没有产生实质修改");
          if (rewriteIssues.length) return send(res, 422, { ok: false, error: `本次生成没有完全执行你的要求：${rewriteIssues.join("；")}，当前稿件已保留。`, code: "REWRITE_VALIDATION_FAILED" });
        }
        if (!compact.previousDraft || compact.adjustmentScope === "full" || compact.adjustmentScope === "engagement") {
          generated = await applyAudienceEngagement(generated, compact, provider);
          if (compact.adjustmentScope !== "engagement") {
            generated = await applyFinalSpeakability(generated, compact, provider);
            generated = await auditAudienceEngagement(generated, compact);
          }
        }
        generated.preflightIssues = {
          qualityGateFailed: Object.values(generated.qualityGates || {}).some((value) => /^FAIL_/.test(String(value))),
          selfCheckFailed: selfCheckFailed(generated),
          repeatedHookResult: repeatsHookResult(generated),
          durationFit: (() => { const bounds = durationBounds(compact.duration); const length = visibleScriptLength(generated); return length >= bounds.minChars && length <= bounds.maxChars; })(),
        };
        if (compact.adaptationMode !== "reference_rebuild" && compact.adjustmentScope !== "engagement") generated = await groundScript(generated, compact, provider);
        generated = removeUnsupportedAdvice(generated, compact);
        let finalMechanical = assessMechanicalInteraction(generated);
        let finalPresence = resolveAudiencePresence(generated, compact.confirmedDirection?.type || generated.contentType, compact.duration);
        let finalSpeakability = assessSpeakability(generated);
        if ((!compact.previousDraft || compact.adjustmentScope === "full") && (finalMechanical.status === "FAIL" || finalPresence.status === "WEAK" || finalSpeakability.status === "FAIL")) {
          generated = await auditAudienceEngagement(generated, compact);
          generated = await applyFinalSpeakability(generated, compact, provider);
          if (compact.adaptationMode !== "reference_rebuild") generated = await groundScript(generated, compact, provider);
          generated = removeUnsupportedAdvice(generated, compact);
          finalMechanical = assessMechanicalInteraction(generated);
          finalPresence = resolveAudiencePresence(generated, compact.confirmedDirection?.type || generated.contentType, compact.duration);
          finalSpeakability = assessSpeakability(generated);
        }
        generated.mechanicalInteractionCheck = finalMechanical;
        generated.audiencePresence = finalPresence;
        generated.speakabilityCheck = finalSpeakability;
        generated = await auditAndRepairAudienceEvidence(generated, compact);
        generated.mechanicalInteractionCheck = assessMechanicalInteraction(generated);
        generated.audiencePresence = resolveAudiencePresence(generated, compact.confirmedDirection?.type || generated.contentType, compact.duration);
        generated.speakabilityCheck = assessSpeakability(generated);
        if (!compact.previousDraft || compact.adjustmentScope === "full" || compact.adjustmentScope === "engagement") {
          const failures = [generated.mechanicalInteractionCheck.status === "FAIL" && "机械互动", generated.audiencePresence.status === "WEAK" && "观众存在感不足", generated.speakabilityCheck.status === "FAIL" && "口播顺畅度", generated.audienceEvidenceCheck.status === "FAIL" && "Evidence 越界"].filter(Boolean);
          if (failures.length) {
            const error = new Error(`最终稿未通过：${failures.join("、")}，请重新生成`);
            error.code = "AUDIENCE_ENGAGEMENT_QUALITY_FAILED";
            throw error;
          }
        }
        if (compact.adaptationMode === "direction_locked") {
          generated = await checkAndRepairFraming(generated, compact);
          if (generated.framingLeakageCheck?.status === "FAIL") return send(res, 422, { ok: false, error: "生成结果仍沿用了参考内容的独特表达框架，请重新生成。", code: "SOURCE_FRAMING_LEAKAGE", framingLeakageCheck: generated.framingLeakageCheck });
          generated = await checkContentDensity(generated, compact);
        }
        generated = removeUnauthorizedCta(generated, compact);
        generated = applyAdjustmentScope(generated, compact.previousDraft, compact.adjustmentScope);
        const finalRewriteIssues = wholeRewriteIssues(compact.previousDraft, generated, compact.adjustment, compact.adjustmentScope);
        if (finalRewriteIssues.length) return send(res, 422, { ok: false, error: `最终审校没有完全执行你的要求：${finalRewriteIssues.join("；")}，当前稿件已保留。`, code: "REWRITE_VALIDATION_FAILED" });
        generated = applyFinalSufficiency(generated, compact);
        const forbiddenHits = forbiddenExpressionHits(generated, compact);
        if (forbiddenHits.length) {
          const error = new Error(`生成结果仍包含你禁用的表达：${forbiddenHits.join("、")}。请重新生成`);
          error.code = "FORBIDDEN_EXPRESSION_REMAINED";
          throw error;
        }
        const edited = await runContentEditor({ llm, currentScript: generated, input: compact, provider, mode: "first_draft" });
        if (edited.needsEditorialInput) return send(res, 200, { ok: true, needsEditorialInput: true, editorialQuestions: edited.editorialQuestions, revisionMemory: edited.revisionMemory, meta: { provider, editMode: "content_editor_first_draft", durationMs: Date.now() - started, editorCallCount: edited.editorCallCount, editorialDiagnosis: edited.editorialDiagnosis } });
        generated = edited.script;
        const debug = generationDebug(generated);
        console.log(`[generation-debug] ${JSON.stringify(debug)}`);
        const finalLength = visibleScriptLength(generated);
        const finalBounds = durationBounds(compact.duration);
        const meta = { provider, durationMs: Date.now() - started, inputChars: JSON.stringify(compact).length, outputChars: finalLength, estimatedSeconds: estimatedSpeechSeconds(generated), targetDuration: Number(compact.duration || 60), durationTolerance: 0.1, durationFit: finalLength <= finalBounds.maxChars, framingLeakageCheck: generated.framingLeakageCheck || { status: "PASS", leaks: [] }, contentDensityCheck: generated.contentDensityCheck || null, engagementPlan: generated.engagementPlan || { moves: [] }, appliedAudienceMoves: generated.appliedAudienceMoves || [], mechanicalInteractionCheck: generated.mechanicalInteractionCheck, audiencePresence: generated.audiencePresence, speakabilityCheck: generated.speakabilityCheck, audienceEvidenceCheck: generated.audienceEvidenceCheck, editorCallCount: edited.editorCallCount, editorialDiagnosis: edited.editorialDiagnosis, editorialValidation: edited.editorialValidation, revisionRejected: edited.revisionRejected === true };
        if (process.env.INCLUDE_GENERATION_DEBUG === "true") meta.debug = debug;
        return send(res, 200, { ok: true, script: publicScript(generated), revisionMemory: edited.revisionMemory, meta });
      } catch (error) {
        if (error.code === "AI_TIMEOUT" || error.name === "AbortError") return send(res, 504, { ok: false, code: "GENERATION_TIMEOUT", error: "AI 生成时间有点长，本次请求已停止，你的内容已经保存，可以重新生成。", structureDraft: structureDraft(compact), meta: { durationMs: Date.now() - started } });
        throw error;
      }
    }
    return send(res, 404, { ok: false, error: "接口不存在" });
  } catch (error) {
    const status = error.code === "AUTH_REQUIRED" || error.code === "AUTH_INVALID" ? 401 : error.code === "LLM_NOT_CONFIGURED" ? 503 : error.code === "AI_TIMEOUT" ? 504 : error.code === "AI_UPSTREAM_ERROR" ? 502 : 422;
    const messages = { AI_TIMEOUT: "AI 处理时间有点长，本次请求已停止，请重试。", AI_NETWORK_ERROR: "暂时无法连接 AI 服务，请稍后重试。", AI_UPSTREAM_ERROR: "AI 服务暂时不可用，请稍后重试。", AI_INVALID_RESPONSE: "AI 返回结果不完整，请重新生成。" };
    return send(res, status, { ok: false, code: error.code || "REQUEST_FAILED", error: messages[error.code] || error.message, ...(error.checks ? { checks: error.checks } : {}) });
  }
}

function serve(req, res) {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.resolve(__dirname, `.${requestPath}`);
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

const HOST = process.env.HOST || (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");
http.createServer((req, res) => req.url.startsWith("/api/") ? api(req, res) : serve(req, res)).listen(PORT, HOST, () => {
  console.log(`口播爆了么 V2.2 running at http://${HOST}:${PORT}`);
  console.log(`AI configured: ${Boolean(process.env.LLM_API_KEY && process.env.LLM_MODEL)}`);
});
