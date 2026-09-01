"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

async function convertRecordingBufferToMp4(buffer, inputExtension = ".webm") {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koubo-recording-export-"));
  const safeExtension = [".webm", ".mp4", ".mov"].includes(inputExtension) ? inputExtension : ".webm";
  const input = path.join(directory, `recording${safeExtension}`);
  const output = path.join(directory, "recording.mp4");
  try {
    await fs.promises.writeFile(input, buffer);
    try {
      await execFileAsync(ffmpegPath, ["-y", "-i", input, "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output], { timeout: Number(process.env.RECORDING_CONVERT_TIMEOUT_MS || 10 * 60 * 1000), maxBuffer: 4 * 1024 * 1024 });
    } catch (cause) {
      const error = new Error("录像转换 MP4 失败"); error.code = "RECORDING_CONVERSION_FAILED"; error.cause = cause; throw error;
    }
    const result = await fs.promises.readFile(output);
    if (result.length < 1024 || !result.subarray(4, 12).toString("ascii").includes("ftyp")) {
      const error = new Error("转换结果不是有效 MP4"); error.code = "INVALID_MP4_OUTPUT"; throw error;
    }
    return result;
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }).catch(() => {}); }
}

module.exports = { convertRecordingBufferToMp4 };
