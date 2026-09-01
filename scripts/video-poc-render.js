const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const jobDir = path.resolve(process.argv[2] || "");
const input = JSON.parse(fs.readFileSync(path.join(jobDir, "input.json"), "utf8"));
const setStatus = (label) => fs.writeFileSync(path.join(jobDir, "status.json"), JSON.stringify({ status: "running", label }));
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const lines = [input.script.hook, ...(input.script.sections || []).map((item) => item.text)].filter(Boolean);
const scriptText = lines.filter((text, index) => index === 0 || text.trim() !== lines[0].trim()).join("\n");

function findHyperframes() {
  try { return require.resolve("hyperframes/bin/hyperframes.mjs", { paths: [process.cwd()] }); }
  catch { /* Fall through to the npx cache used by local developer installs. */ }
  const roots = process.platform === "win32"
    ? [path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx")]
    : [path.join(os.homedir(), ".npm", "_npx")];
  for (const root of roots) {
    for (const folder of fs.existsSync(root) ? fs.readdirSync(root) : []) {
      const candidate = path.join(root, folder, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  throw new Error("未找到 HyperFrames，请先运行 npx hyperframes --version");
}

function executable(name) {
  if (name === "ffmpeg") return require("ffmpeg-static");
  if (name === "ffprobe") return require("ffprobe-static").path;
  try { return execFileSync("where.exe", [name], { encoding: "utf8" }).trim().split(/\r?\n/)[0]; }
  catch { throw new Error(`未找到 ${name}，请安装后重试`); }
}

setStatus("正在生成旁白");
const audioFile = path.join(jobDir, "voiceover.mp3");
const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
execFileSync(python, ["-m", "edge_tts", "--voice", "zh-CN-YunxiNeural", "--rate=+12%", "--text", scriptText, "--write-media", audioFile], { stdio: "inherit", timeout: 5 * 60 * 1000 });
const ffprobe = executable("ffprobe");
const ffmpeg = executable("ffmpeg");
const duration = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioFile], { encoding: "utf8" }).trim());
if (!Number.isFinite(duration) || duration <= 0) throw new Error("无法读取旁白时长");

setStatus("正在匹配画面");
const clauses = scriptText.split(/(?<=[。！？!?])/).map((text) => text.trim()).filter(Boolean);
const total = clauses.reduce((sum, text) => sum + text.length, 0); let cursor = 0;
const timed = clauses.map((text, index) => { const raw = duration * text.length / total; const item = { text, start: cursor, duration: index === clauses.length - 1 ? duration - cursor : raw }; cursor += raw; return item; });
const assets = (input.assets || []).filter((asset) => fs.existsSync(asset.path));
const visuals = assets.map((asset) => { const src = path.relative(jobDir, asset.path).replace(/\\/g, "/"); return asset.type.startsWith("video/") ? `<video src="${esc(src)}" muted loop></video>` : `<img src="${esc(src)}" alt="真实素材">`; });
const scenes = timed.map((item, index) => {
  const visual = visuals.length ? visuals[index % visuals.length] : `<div class="product-shot"><b>口播爆了么</b><span>从真实素材，到可预览的视频</span><i>${String(index + 1).padStart(2, "0")}</i></div>`;
  return `<section id="scene-${index + 1}" class="clip scene s${index % 4}" data-start="${item.start.toFixed(3)}" data-duration="${Math.max(.5, item.duration).toFixed(3)}"><div class="visual">${visual}</div><div class="shade"></div><div class="kicker">真实开发记录</div><div class="caption">${esc(item.text)}</div><div class="progress"><i style="width:${((index + 1) / timed.length * 100).toFixed(1)}%"></i></div></section>`;
}).join("\n");

setStatus("正在生成字幕");
const css = `*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#16120f;font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#fff}.clip{position:absolute;inset:0;overflow:hidden}.visual{position:absolute;inset:0}.visual img,.visual video{width:100%;height:100%;object-fit:cover;animation:zoom 5s ease-out both}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,7,.12),rgba(10,8,7,.08) 38%,rgba(10,8,7,.88) 78%)}.kicker{position:absolute;top:120px;left:74px;padding:14px 20px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:rgba(20,15,12,.28);font-size:26px;font-weight:700;letter-spacing:.12em}.caption{position:absolute;left:70px;right:70px;bottom:210px;font-size:58px;font-weight:900;line-height:1.42;text-shadow:0 4px 18px rgba(0,0,0,.65);animation:rise .45s ease-out both}.caption::first-letter{color:#ff7a52}.progress{position:absolute;left:70px;right:70px;bottom:115px;height:8px;border-radius:8px;background:rgba(255,255,255,.2)}.progress i{display:block;height:100%;border-radius:8px;background:#ff6b42}.product-shot{width:100%;height:100%;padding:210px 80px;background:radial-gradient(circle at 72% 23%,#ffb091 0,transparent 26%),linear-gradient(145deg,#fff6ef,#e86b46 55%,#59271c);display:flex;flex-direction:column;justify-content:center}.product-shot b{font-size:108px;line-height:1.05}.product-shot span{margin-top:30px;font-size:38px;line-height:1.5;max-width:760px}.product-shot i{position:absolute;right:70px;top:120px;font-size:210px;font-style:normal;font-weight:900;color:rgba(255,255,255,.15)}.s1 .product-shot{background:linear-gradient(155deg,#1f1c18,#784b39)}.s2 .product-shot{background:radial-gradient(circle at 30% 22%,#ffd0a5,transparent 28%),linear-gradient(140deg,#ef7955,#4e241a)}.s3 .product-shot{background:linear-gradient(145deg,#27231f,#b65e40)}@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}@keyframes zoom{from{transform:scale(1)}to{transform:scale(1.07)}}`;
fs.writeFileSync(path.join(jobDir, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><main data-composition-id="case-01" data-no-timeline data-width="1080" data-height="1920" data-fps="30" data-duration="${duration.toFixed(3)}"><audio id="voiceover" class="clip" src="voiceover.mp3" data-start="0" data-duration="${duration.toFixed(3)}" data-has-audio="true"></audio>${scenes}</main></body></html>`);
fs.writeFileSync(path.join(jobDir, "video-plan.json"), JSON.stringify({ version: 1, width: 1080, height: 1920, targetDuration: input.targetDuration, actualVoiceDuration: duration, assetStrategy: assets.length ? "user_assets_and_text_cards" : "product_text_cards", segments: timed }, null, 2));

setStatus("正在合成视频");
const renderPath = [path.dirname(ffmpeg), path.dirname(ffprobe), process.env.Path || process.env.PATH || ""].join(path.delimiter);
execFileSync(process.execPath, [findHyperframes(), "render", jobDir, "--output", path.join(jobDir, "output.mp4"), "--quality", "draft", "--workers", "1", "--no-browser-gpu", "--skill", "hyperframes"], { stdio: "inherit", timeout: 30 * 60 * 1000, env: { ...process.env, Path: renderPath, PATH: renderPath, FFMPEG_PATH: ffmpeg, FFPROBE_PATH: ffprobe } });
const outputDuration = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path.join(jobDir, "output.mp4")], { encoding: "utf8" }).trim());
fs.writeFileSync(path.join(jobDir, "result.json"), JSON.stringify({ duration: outputDuration, audioDuration: duration, width: 1080, height: 1920 }, null, 2));
