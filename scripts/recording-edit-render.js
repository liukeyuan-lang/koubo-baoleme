"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const { spawnSync } = require("child_process");

const jobDir = path.resolve(process.argv[2] || "");
const input = JSON.parse(fs.readFileSync(path.join(jobDir, "input.json"), "utf8"));
const statusFile = path.join(jobDir, "status.json");
const setStatus = (label) => fs.writeFileSync(statusFile, JSON.stringify({ status: "running", label }));
const source = path.resolve(input.sourcePath);
const output = path.join(jobDir, "output.mp4");

function probeDuration(file) {
  const result = spawnSync(ffmpeg, ["-i", file], { encoding: "utf8" });
  const match = String(result.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error("无法读取视频时长");
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function assEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/[{}]/g, "").replace(/\r?\n/g, "\\N");
}

function assTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const secs = (value % 60).toFixed(2).padStart(5, "0");
  return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
}

function splitLines(text) {
  return String(text || "").split(/(?<=[。！？!?])|\n+/).map((item) => item.trim()).filter(Boolean);
}

function highlighted(text, enabled) {
  if (!enabled) return assEscape(text);
  const pattern = /([最核心关键真正结果但是因为所以注意千万不要]{2,6}|\d+(?:\.\d+)?%?)/g;
  return assEscape(text).replace(pattern, "{\\c&H63A4FF&}$1{\\c&HFFFFFF&}");
}

const originalDuration = probeDuration(source);
const start = Math.max(0, Math.min(originalDuration - 0.2, Number(input.trimStart) || 0));
const requestedEnd = Number(input.trimEnd) || originalDuration;
const end = Math.max(start + 0.2, Math.min(originalDuration, requestedEnd));
const duration = end - start;
const template = ["clean", "viral", "warm"].includes(input.template) ? input.template : "clean";
const styles = {
  clean: { primary: "&H00FFFFFF", outline: "&H00101010", filter: "eq=contrast=1.03:saturation=1.02" },
  viral: { primary: "&H00FFFFFF", outline: "&H001B1020", filter: "eq=contrast=1.12:saturation=1.16,unsharp=5:5:0.45" },
  warm: { primary: "&H00F4F5FF", outline: "&H00201A18", filter: "eq=contrast=1.02:saturation=1.08:gamma_r=1.035:gamma_b=0.97" },
  }[template];

setStatus("正在整理字幕和片头");
const fontSize = template === "viral" ? 72 : 62;
const ass = [`[Script Info]`, `ScriptType: v4.00+`, `PlayResX: 1080`, `PlayResY: 1920`, `ScaledBorderAndShadow: yes`, `WrapStyle: 0`, ``, `[V4+ Styles]`, `Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding`, `Style: Caption,PingFang SC,${fontSize},${styles.primary},${styles.primary},${styles.outline},&H65000000,-1,0,0,0,100,100,1,0,1,5,1,2,80,80,210,1`, `Style: Title,PingFang SC,82,&H00FFFFFF,&H00FFFFFF,&H00101010,&H65000000,-1,0,0,0,100,100,1,0,1,6,2,5,70,70,0,1`, `Style: End,PingFang SC,64,&H00FFFFFF,&H00FFFFFF,&H00101010,&H65000000,-1,0,0,0,100,100,1,0,1,5,2,5,70,70,0,1`, ``, `[Events]`, `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`];
const introDuration = input.introTitle ? Math.min(2.2, duration) : 0;
if (input.introTitle) ass.push(`Dialogue: 2,${assTime(0)},${assTime(introDuration)},Title,,0,0,0,,{\\fad(180,280)}${assEscape(input.introTitle).slice(0, 80)}`);
if (input.outroText && duration > 2) ass.push(`Dialogue: 2,${assTime(Math.max(0, duration - 2.2))},${assTime(duration)},End,,0,0,0,,{\\fad(220,180)}${assEscape(input.outroText).slice(0, 60)}`);
const lines = splitLines(input.captionText);
const weights = lines.map((line) => Math.max(4, line.replace(/\s/g, "").length));
const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
let cursor = 0;
lines.forEach((line, index) => {
  const lineDuration = index === lines.length - 1 ? duration - cursor : duration * weights[index] / totalWeight;
  const finish = Math.min(duration, cursor + Math.max(0.6, lineDuration));
  ass.push(`Dialogue: 1,${assTime(cursor)},${assTime(finish)},Caption,,0,0,0,,${highlighted(line, input.highlightKeywords)}`);
  cursor = finish;
});
const subtitleFile = path.join(jobDir, "captions.ass");
fs.writeFileSync(subtitleFile, ass.join("\n"));

setStatus("正在剪辑并导出 MP4");
const subtitlePath = subtitleFile.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
const filters = [`scale=1080:1920:force_original_aspect_ratio=increase`, `crop=1080:1920`, styles.filter, `subtitles='${subtitlePath}'`];
const volume = Math.max(0, Math.min(2, Number(input.volume ?? 1)));
execFileSync(ffmpeg, ["-y", "-ss", String(start), "-i", source, "-t", String(duration), "-vf", filters.join(","), "-af", `volume=${volume}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output], { stdio: "inherit", timeout: Number(process.env.RECORDING_EDIT_TIMEOUT_MS || 20 * 60 * 1000) });
const outputDuration = probeDuration(output);
fs.writeFileSync(path.join(jobDir, "result.json"), JSON.stringify({ duration: outputDuration, width: 1080, height: 1920 }, null, 2));
