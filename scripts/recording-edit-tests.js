"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const { spawnSync } = require("child_process");

function inspect(file) {
  const result = spawnSync(ffmpeg, ["-i", file], { encoding: "utf8" });
  const text = String(result.stderr || "");
  const durationMatch = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const videoMatch = text.match(/Video:\s*([^,]+).*?,\s*(\d{2,5})x(\d{2,5})/);
  const audioMatch = text.match(/Audio:\s*([^,]+)/);
  return { duration: durationMatch ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]) : 0, videoCodec: videoMatch?.[1]?.trim(), width: Number(videoMatch?.[2]), height: Number(videoMatch?.[3]), audioCodec: audioMatch?.[1]?.trim() };
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "koubo-recording-edit-test-"));
try {
  const source = path.join(directory, "source.mp4");
  execFileSync(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=0x46616f:s=540x960:d=4", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source], { stdio: "ignore" });
  fs.writeFileSync(path.join(directory, "input.json"), JSON.stringify({ sourcePath: source, trimStart: 0.4, trimEnd: 3.4, volume: 0.8, template: "viral", captionText: "这是一段测试字幕。\n关键结果一定要讲清楚！", highlightKeywords: true, introTitle: "口播剪辑测试", outroText: "这是片尾" }));
  execFileSync(process.execPath, [path.join(__dirname, "recording-edit-render.js"), directory], { stdio: "inherit", timeout: 120000 });
  const output = path.join(directory, "output.mp4");
  assert(fs.existsSync(output), "应该生成 output.mp4");
  const media = inspect(output);
  const duration = media.duration;
  assert(duration >= 2.8 && duration <= 3.2, `裁剪后时长异常: ${duration}`);
  assert.match(media.videoCodec || "", /h264/);
  assert.equal(media.width, 1080);
  assert.equal(media.height, 1920);
  assert.match(media.audioCodec || "", /aac/);
  console.log(JSON.stringify({ passed: true, duration, video: `${media.width}x${media.height}/${media.videoCodec}`, audio: media.audioCodec, bytes: fs.statSync(output).size }, null, 2));
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
