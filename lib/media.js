"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const dns = require("dns").promises;
const net = require("net");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

function ensureMediaBinaryExecutable(binaryPath) {
  if (process.platform === "win32" || !binaryPath || !fs.existsSync(binaryPath)) return;
  try {
    const mode = fs.statSync(binaryPath).mode;
    if ((mode & 0o111) === 0) fs.chmodSync(binaryPath, mode | 0o755);
  } catch (cause) {
    const error = new Error(`媒体处理程序无法执行：${path.basename(binaryPath)}`);
    error.code = "MEDIA_RUNTIME_PERMISSION_DENIED";
    error.cause = cause;
    throw error;
  }
}

ensureMediaBinaryExecutable(ffmpegPath);

async function probeMediaDuration(file) {
  let stderr = "";
  try {
    ({ stderr } = await execFileAsync(ffmpegPath, ["-hide_banner", "-i", file, "-t", "0.1", "-f", "null", "-"], { timeout: 25_000, maxBuffer: 2 * 1024 * 1024 }));
  } catch (cause) {
    stderr = String(cause.stderr || "");
    if (!/Duration:\s*\d{2}:\d{2}:\d{2}/.test(stderr)) throw cause;
  }
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) throw new Error("媒体时长无法读取");
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// 10 分钟的高码率竖屏视频经常超过 80 MB。这里只把视频临时落盘，随后
// 立即提取成 16 kHz 单声道音频并在 finally 中清理，因此默认允许到 512 MB。
const MAX_MEDIA_MB = Number(process.env.SOURCE_MEDIA_MAX_MB || 512);
const MAX_BYTES = MAX_MEDIA_MB * 1024 * 1024;
const MAX_DURATION = Number(process.env.SOURCE_VIDEO_MAX_SECONDS || 1200);

function isPrivateIp(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.");
}

async function assertSafeRemoteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("媒体地址无效"); }
  if (url.protocol !== "https:" && !(process.env.ALLOW_HTTP_MEDIA_URLS === "true" && url.protocol === "http:")) throw new Error("媒体地址必须使用 HTTPS");
  if (url.username || url.password || url.port) throw new Error("媒体地址不受信任");
  const allow = String(process.env.MEDIA_HOST_ALLOWLIST || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const host = url.hostname.toLowerCase();
  if (allow.length && !allow.some((domain) => host === domain || host.endsWith(`.${domain}`))) throw new Error("媒体源域名不在白名单");
  const addresses = await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) throw new Error("媒体地址指向受保护的网络");
  return url.toString();
}

async function download(url, destination) {
  let current = await assertSafeRemoteUrl(url);
  for (let redirects = 0; redirects < 4; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.MEDIA_TIMEOUT_MS || 300_000));
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36",
          Referer: "https://www.xiaohongshu.com/",
          Accept: "video/*,audio/*;q=0.9,*/*;q=0.8",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("媒体重定向地址缺失");
        current = await assertSafeRemoteUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok || !response.body) throw new Error(`媒体下载失败 ${response.status}`);
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (/text\/|application\/(?:json|xml)|image\//.test(contentType)) throw new Error(`候选地址返回的不是视频或音频（${contentType || "未知类型"}）`);
      const declared = Number(response.headers.get("content-length") || 0);
      if (declared > MAX_BYTES) throw new Error(`媒体文件超过 ${MAX_MEDIA_MB} MB 大小限制`);
      const stream = fs.createWriteStream(destination, { flags: "wx" });
      let size = 0;
      try {
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > MAX_BYTES) throw new Error(`媒体文件超过 ${MAX_MEDIA_MB} MB 大小限制`);
          if (!stream.write(chunk)) await new Promise((resolve) => stream.once("drain", resolve));
        }
      } finally { await new Promise((resolve) => stream.end(resolve)); }
      if (size < 16 * 1024) throw new Error("候选媒体文件过小，可能是视频分片或失效响应");
      return;
    } finally { clearTimeout(timeout); }
  }
  throw new Error("媒体重定向次数过多");
}

async function extractAudioFromDownloadedFile(video, transcribeFile) {
  const audio = path.join(path.dirname(video), `source-audio-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`);
  try {
    let duration;
    try { duration = await probeMediaDuration(video); }
    catch (cause) { const permissionDenied = cause.code === "EACCES"; const error = new Error(permissionDenied ? "媒体探测程序没有执行权限，服务已尝试自动修复，请重启后重试" : "下载的视频文件无法读取或已经失效"); error.code = permissionDenied ? "MEDIA_RUNTIME_PERMISSION_DENIED" : "MEDIA_PROBE_FAILED"; error.stage = "probe"; error.cause = cause; throw error; }
    if (!Number.isFinite(duration) || duration > MAX_DURATION) throw new Error(`视频时长不能超过 ${MAX_DURATION} 秒`);
    try { await execFileAsync(ffmpegPath, ["-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", audio], { timeout: Number(process.env.MEDIA_EXTRACT_TIMEOUT_MS || 180_000), maxBuffer: 1024 * 1024 }); }
    catch (cause) { const error = new Error("视频音轨提取失败"); error.code = "AUDIO_EXTRACTION_FAILED"; error.stage = "extract"; error.cause = cause; throw error; }
    try { return await transcribeFile(audio); }
    catch (cause) { if (cause.code) throw cause; const error = new Error(`语音转写失败：${cause.message}`); error.code = "ASR_FAILED"; error.stage = "transcribe"; throw error; }
  } finally { await fs.promises.rm(audio, { force: true }); }
}

async function extractAudio(videoUrl, transcribeFile) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-source-"));
  const video = path.join(directory, "source-video");
  try {
    try { await download(videoUrl, video); }
    catch (cause) { const error = new Error(`视频下载失败：${cause.message}`); error.code = "MEDIA_DOWNLOAD_FAILED"; error.stage = "download"; throw error; }
    return await extractAudioFromDownloadedFile(video, transcribeFile);
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
}

module.exports = { assertSafeRemoteUrl, extractAudio, extractAudioFromDownloadedFile, mediaLimits: { maxBytes: MAX_BYTES, maxMediaMb: MAX_MEDIA_MB, maxDurationSeconds: MAX_DURATION } };
