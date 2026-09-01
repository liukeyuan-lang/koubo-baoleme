"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const port = 43173;
const base = `http://127.0.0.1:${port}`;
const projectRoot = path.join(__dirname, "..");
const envText = fs.existsSync(path.join(projectRoot, ".env")) ? fs.readFileSync(path.join(projectRoot, ".env"), "utf8") : "";
const importToken = envText.match(/^EXTENSION_IMPORT_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") || "";
const child = spawn(process.execPath, ["server.js"], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(port), LOCAL_ASR_ENABLED: "true", DASHSCOPE_API_KEY: "", OPENAI_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("测试服务未启动");
}

(async () => {
  try {
    await waitForServer();
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.asrConfigured, true, "本地 ASR 应被识别为已配置");
    assert.equal(health.asrProvider, "local-funasr", "回归测试必须在仅本地 ASR 模式下运行");

    const response = await fetch(`${base}/api/import-browser-post`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(importToken ? { authorization: `Bearer ${importToken}` } : {}) },
      body: JSON.stringify({
        url: "https://www.xiaohongshu.com/explore/local-asr-regression",
        contentType: "video",
        content: { title: "本地 ASR 入口回归", text: "用于验证只配置本地 ASR 时仍会创建逐字稿任务。", transcript: "" },
        media: { videoUrl: "https://sns-video-hw.xhscdn.com/local-asr-regression.mp4", videoCandidates: [] },
        metrics: {}, comments: [], author: {},
      }),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert(result.transcriptionJobId, "扩展导入应在本地 ASR 模式下创建转写任务");
    console.log(JSON.stringify({ passed: true, asrProvider: health.asrProvider, transcriptionJobCreated: true }, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
