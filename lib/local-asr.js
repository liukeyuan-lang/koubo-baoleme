"use strict";

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let worker = null;
let responseBuffer = "";
let sequence = 0;
const pending = new Map();

function failPending(message, code = "LOCAL_ASR_FAILED") {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    const error = new Error(message); error.code = code; reject(error);
  }
  pending.clear();
}

function startWorker() {
  if (worker && !worker.killed) return worker;
  responseBuffer = "";
  const projectPython = path.join(__dirname, "..", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const python = process.env.PYTHON_BIN || (fs.existsSync(projectPython) ? projectPython : (process.platform === "win32" ? "python" : "python3"));
  worker = spawn(python, [path.join(__dirname, "..", "scripts", "local_asr_worker.py")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    stdio: ["pipe", "ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  worker.stdio[3].setEncoding("utf8");
  worker.stdio[3].on("data", (chunk) => {
    responseBuffer += chunk;
    let newline;
    while ((newline = responseBuffer.indexOf("\n")) >= 0) {
      const line = responseBuffer.slice(0, newline); responseBuffer = responseBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      let payload;
      try { payload = JSON.parse(line); } catch { continue; }
      const request = pending.get(payload.id);
      if (!request) continue;
      clearTimeout(request.timer); pending.delete(payload.id);
      if (payload.ok) request.resolve(payload.result);
      else { const error = new Error(payload.error || "本地语音识别失败"); error.code = payload.code || "LOCAL_ASR_FAILED"; request.reject(error); }
    }
  });
  let stderr = "";
  worker.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-4000);
    if (process.env.LOCAL_ASR_DEBUG === "true") process.stderr.write(chunk);
  });
  worker.on("error", (error) => { failPending(`无法启动本地 ASR：${error.message}`, "LOCAL_ASR_START_FAILED"); worker = null; });
  worker.on("exit", () => { failPending(stderr.trim().split(/\r?\n/).slice(-2).join("；") || "本地 ASR 进程已退出"); worker = null; });
  return worker;
}

function transcribeLocalFile(file, vocabulary = []) {
  const child = startWorker();
  const id = String(++sequence);
  return new Promise((resolve, reject) => {
    const timeoutMs = Math.max(30_000, Number(process.env.LOCAL_ASR_TIMEOUT_SECONDS || 1800) * 1000);
    const timer = setTimeout(() => { pending.delete(id); const error = new Error("本地语音识别超时，首次运行可能仍在下载模型"); error.code = "LOCAL_ASR_TIMEOUT"; reject(error); }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ id, file, vocabulary: vocabulary.slice(0, 30) })}\n`);
  });
}

module.exports = { transcribeLocalFile };
