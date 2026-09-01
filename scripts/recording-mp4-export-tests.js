"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const { convertRecordingBufferToMp4 } = require("../lib/recording-export");
const execFileAsync = promisify(execFile);

(async () => {
  const projectRoot = path.join(__dirname, "..");
  const html = await fs.promises.readFile(path.join(projectRoot, "index.html"), "utf8");
  const app = await fs.promises.readFile(path.join(projectRoot, "app.js"), "utf8");
  assert(html.includes('id="retake-recording"'), "拍摄后缺少重新拍摄按钮");
  assert(html.includes('id="new-recording"'), "拍摄后缺少再拍一条按钮");
  assert(app.includes("prepareAnotherRecording({ discardCurrent: true })"), "重拍没有丢弃旧录像的状态处理");
  assert(app.includes("prepareAnotherRecording({ discardCurrent: false })"), "再拍一条没有保留当前导出的状态处理");
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-mp4-export-test-"));
  const webm = path.join(directory, "recording.webm");
  const mp4 = path.join(directory, "recording.mp4");
  try {
    await execFileAsync(ffmpegPath, ["-y", "-f", "lavfi", "-i", "color=c=black:s=360x640:r=24", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "2", "-c:v", "libvpx-vp9", "-c:a", "libopus", webm], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    const converted = await convertRecordingBufferToMp4(await fs.promises.readFile(webm), ".webm");
    await fs.promises.writeFile(mp4, converted);
    let probe = "";
    try { ({ stderr: probe } = await execFileAsync(ffmpegPath, ["-hide_banner", "-i", mp4, "-f", "null", "-"], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 })); }
    catch (error) { probe = String(error.stderr || ""); }
    assert(/Video:\s*h264/i.test(probe), `视频编码不是 H.264: ${probe.slice(0, 500)}`);
    assert(/Audio:\s*aac/i.test(probe), `音频编码不是 AAC: ${probe.slice(0, 500)}`);
    assert(converted.subarray(4, 12).toString("ascii").includes("ftyp"), "输出缺少 MP4 ftyp 容器标识");
    console.log(JSON.stringify({ passed: true, input: "WebM/VP9/Opus", output: "MP4/H.264/AAC", bytes: converted.length }, null, 2));
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
