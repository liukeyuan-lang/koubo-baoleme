"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const { extractAudioFromDownloadedFile, mediaLimits } = require("../lib/media");
const execFileAsync = promisify(execFile);

assert(mediaLimits.maxMediaMb >= 512, `默认媒体上限仍只有 ${mediaLimits.maxMediaMb} MB`);
assert(mediaLimits.maxDurationSeconds >= 600, `默认视频时长上限不足10分钟：${mediaLimits.maxDurationSeconds}秒`);
assert(mediaLimits.maxBytes === mediaLimits.maxMediaMb * 1024 * 1024, "媒体字节上限计算错误");

(async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-10m-regression-"));
  const video = path.join(directory, "ten-minutes.mp4");
  try {
    await execFileAsync(ffmpegPath, ["-y", "-f", "lavfi", "-i", "color=c=black:s=160x90:r=1", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=16000", "-t", "600", "-c:v", "mpeg4", "-q:v", "31", "-c:a", "aac", "-b:a", "24k", "-shortest", video], { timeout: 120_000, maxBuffer: 1024 * 1024 });
    const result = await extractAudioFromDownloadedFile(video, async (audio) => ({ text: "10分钟音轨提取成功", audioBytes: (await fs.promises.stat(audio)).size }));
    assert(result.audioBytes > 100_000, `提取出的音轨异常：${result.audioBytes}`);
    console.log(JSON.stringify({ passed: true, scenario: "10-minute-video-full-media-stage", mediaLimits, videoBytes: (await fs.promises.stat(video)).size, audioBytes: result.audioBytes }, null, 2));
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
