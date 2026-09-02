const cases = [
  {
    id: "workplace-proof",
    title: "真正拖垮你的，不是能力差，而是太晚证明自己",
    category: "职场",
    platform: "小红书",
    metrics: "8.6 万赞 · 3.1 万收藏",
    tags: ["反常识", "身份焦虑", "可执行"],
    preview: "很多人以为，只要埋头把事情做好，迟早会被看见。可在职场里，结果如果没有被看见，就很难变成你的信用。",
    analysis: {
      "选题": "把“努力没回报”的普遍委屈，翻译成一个更具体、更能行动的问题。",
      "开头": "先否定用户熟悉的答案，再给出一个让人意外但合理的新解释。",
      "留人": "从认知冲突快速过渡到三种真实场景，让用户不断对号入座。",
      "传播": "“结果不会自己说话”这句话短、反常识，也适合被截图转发。",
    },
    structure: ["反常识判断", "指出常见误区", "三个具体场景", "给出行动办法", "金句收口"],
  },
  {
    id: "parenting-emotion",
    title: "孩子不听话的时候，最先失控的往往不是孩子",
    category: "亲子",
    platform: "抖音",
    metrics: "126 万赞 · 9.4 万评论",
    tags: ["情绪共鸣", "场景感", "温和反转"],
    preview: "你越着急让孩子安静，他就越听不见你在说什么。不是他故意对抗，而是两个人的情绪都已经超过了能沟通的线。",
    analysis: {
      "选题": "切中父母每天都会遇到、又常常自责的高频情绪时刻。",
      "开头": "把矛头从孩子转回成年人，制造轻微刺痛和继续听下去的动力。",
      "留人": "用一个家庭现场代替说教，再给出一句当下就能用的话。",
      "传播": "不指责父母，用理解完成反转，更容易引发分享和讨论。",
    },
    structure: ["冲突现场", "责任反转", "解释真实原因", "给一句替代说法", "共情收口"],
  },
  {
    id: "fitness-small",
    title: "减脂最容易失败的人，都在第一天做得太好了",
    category: "健康",
    platform: "小红书",
    metrics: "12.4 万赞 · 7.8 万收藏",
    tags: ["反直觉", "低门槛", "方法论"],
    preview: "第一天跑五公里、戒掉所有碳水、晚上饿着睡。你以为这是自律，其实是在提前透支下周的意志力。",
    analysis: {
      "选题": "抓住减脂反复失败者最熟悉的挫败感，并替他们解除“我不自律”的羞耻。",
      "开头": "把“开局努力”重新定义为失败信号，反差足够强。",
      "留人": "连续列举三个过度努力的细节，再给出更低门槛的替代方案。",
      "传播": "“不要证明你能狠一天，要证明你能做一百天”具有记忆点。",
    },
    structure: ["反直觉结论", "列举熟悉行为", "解释失败机制", "降低行动门槛", "记忆点总结"],
  },
  {
    id: "creator-start",
    title: "普通人做自媒体，第一条视频千万别自我介绍",
    category: "自媒体",
    platform: "抖音",
    metrics: "48 万赞 · 21 万收藏",
    tags: ["新人痛点", "直接建议", "立刻可用"],
    preview: "没人认识你的时候，大家并不关心你是谁。他们只关心：停下来这几十秒，我能得到什么？",
    analysis: {
      "选题": "直接解决新手发布第一条内容时最具体、最迫切的选择困难。",
      "开头": "用“千万别”制造紧迫感，同时否定大多数新人的默认动作。",
      "留人": "先讲用户不关心什么，再给三个可以直接套用的开头。",
      "传播": "建议明确、门槛低，用户收藏后就能马上用于下一条视频。",
    },
    structure: ["明确劝阻", "解释观众视角", "给出三个模板", "示范一个案例", "鼓励立刻发布"],
  },
  {
    id: "money-choice",
    title: "工资涨得慢的人，通常把选择顺序搞反了",
    category: "成长",
    platform: "小红书",
    metrics: "6.7 万赞 · 4.3 万收藏",
    tags: ["认知升级", "职场成长", "框架"],
    preview: "先看工资，再看岗位，最后才看能学到什么——这个顺序看似务实，却可能把你困在低增长里。",
    analysis: {
      "选题": "借收入焦虑切入，但最终提供的是选择工作机会的判断框架。",
      "开头": "不批评不努力，而是指出顺序错误，给用户留下改变空间。",
      "留人": "将抽象选择拆成三个优先级，每一步都有清晰判断标准。",
      "传播": "结构化框架适合收藏，也容易带动“你更看重什么”的讨论。",
    },
    structure: ["指出结果差距", "定位隐蔽错误", "重排三个优先级", "解释适用边界", "问题式 CTA"],
  },
  {
    id: "relationship-boundary",
    title: "一段关系开始变累，往往是从这句‘没关系’开始的",
    category: "情感",
    platform: "抖音",
    metrics: "93 万赞 · 11 万评论",
    tags: ["情绪钩子", "细节洞察", "边界感"],
    preview: "你嘴上说没关系，心里却默默记了一笔。对方以为事情过去了，你却在等他有一天自己明白。",
    analysis: {
      "选题": "把关系里的长期消耗，落在一句所有人都说过的日常表达上。",
      "开头": "用一个微小细节预告严重后果，形成强烈的悬念感。",
      "留人": "描述双方完全不同的心理活动，让观众同时看到自己和对方。",
      "传播": "没有制造性别对立，强调表达边界，讨论空间更大。",
    },
    structure: ["日常小细节", "预告关系后果", "还原双方心理", "提供表达句式", "边界金句"],
  },
];

const caseSignals = {
  "workplace-proof": { creatorName: "小杨的职场笔记", followers: 5200, likes: 86000, comments: 4200, collects: 31000, averageLikes: 2800, explosionRate: 31, learn: ["作者只有 5200 粉，单条获得 8.6 万赞", "开头直接推翻“努力会被看见”的默认认知", "不依赖名人身份，表达结构适合新人"], avoid: "原作者有管理经验提供信任。新人应保留结构，换成自己亲历的汇报场景。", difficulty: "简单", difficultyReason: ["不需要专业身份", "不需要复杂拍摄", "主要依靠场景与表达结构"] },
  "parenting-emotion": { creatorName: "橙子妈妈成长记", followers: 18000, likes: 1260000, comments: 94000, collects: 218000, averageLikes: 21000, explosionRate: 60, learn: ["小体量账号获得百万级点赞", "家庭冲突场景一秒引发代入", "不批判任何一方，评论讨论空间大"], avoid: "不要照搬育儿建议。没有相关经历时，应替换为自己真实观察到的关系场景。", difficulty: "中等", difficultyReason: ["需要真实生活细节", "情绪尺度要克制", "表演要求不高"] },
  "fitness-small": { creatorName: "阿凯轻量健身", followers: 8700, likes: 124000, comments: 6800, collects: 78000, averageLikes: 5100, explosionRate: 24, learn: ["收藏率高，方法具有长期价值", "反直觉结论在 3 秒内建立悬念", "方案门槛低，新人容易讲清楚"], avoid: "避免把个体经验包装成医学结论。保留习惯设计结构，替换成自己验证过的方法。", difficulty: "简单", difficultyReason: ["单机位即可完成", "结构短且清晰", "案例可来自个人体验"] },
  "creator-start": { creatorName: "一只野生运营", followers: 12000, likes: 480000, comments: 17000, collects: 210000, averageLikes: 9200, explosionRate: 52, learn: ["粉丝不高但收藏达到 21 万", "直接解决新人第一条内容的具体问题", "给模板、给案例，用户拿来就能用"], avoid: "不要复制原作者提供的开头模板原句。应保留“劝阻—解释—示范”顺序。", difficulty: "简单", difficultyReason: ["无需行业背书", "口播即可完成", "内容结构可直接迁移"] },
  "money-choice": { creatorName: "林同学聊成长", followers: 6300, likes: 67000, comments: 3900, collects: 43000, averageLikes: 2400, explosionRate: 28, learn: ["低粉账号跑出 28 倍平均数据", "用收入焦虑吸引人，用选择框架交付价值", "框架明确，天然适合收藏"], avoid: "不同阶段的工作选择差异很大。不要照搬优先级，要补充自己的适用边界。", difficulty: "中等", difficultyReason: ["需要观点自洽", "最好有个人选择案例", "拍摄成本很低"] },
  "relationship-boundary": { creatorName: "小禾的关系课", followers: 26000, likes: 930000, comments: 110000, collects: 176000, averageLikes: 18000, explosionRate: 52, learn: ["单条数据超过账号平均 52 倍", "从一句日常话切入长期关系问题", "没有性别对立，受众覆盖更广"], avoid: "原作者的咨询师身份贡献了一部分信任。新人适合分享个人感受，不要冒充专业建议。", difficulty: "中等", difficultyReason: ["需要细腻的生活观察", "表达要避免说教", "无需复杂场景"] },
};

cases.forEach((item) => Object.assign(item, caseSignals[item.id], { provenance: "demo", tags: ["演示数据", ...item.tags.slice(0, 2)] }));

const emptyPersona = { userId: "local-user", identity: "", contentDirection: "", targetAudience: "", personalStory: "", speakingStyle: "真诚直接", preferredPlatform: "通用短视频", contentGoal: "建立信任", titleStyle: "真实克制", ctaPreference: "不主动号召", forbiddenExpressions: "", voiceSample: "", voiceDNA: null };
let savedPersona = null;
try { savedPersona = JSON.parse(localStorage.getItem("koubo-persona") || "null"); } catch { localStorage.removeItem("koubo-persona"); }
const state = { filter: "全部", selected: null, generation: 0, rephrase: 0, lastInput: null, lastScript: null, previousVersion: null, scriptVariants: { full: null, spoken: null, outline: null }, abCandidates: [], activeCandidate: "A", generationStatus: "idle", persona: savedPersona || emptyPersona, followUpAsked: false, evidenceMiningActive: false, evidenceSufficiency: null, evidenceResearch: null, externalEvidence: [], parsedCase: null, adjustment: null, aiConfigured: false, doubaoConfigured: false, flowMode: "reference", viewMode: "natural", currentProjectId: null, selectedSection: null, contentDirections: [], directionAnalysis: null, selectedDirection: null, confirmedStrategy: null, directionStatus: "EMPTY", revisionMemory: { acceptedPatterns: [], rejectedPatterns: [], resolvedProblems: [], remainingProblems: [], userFeedback: [] }, voiceTranscript: null, guide: { step: 0, mode: "", answers: {} } };
const $ = (selector) => document.querySelector(selector);
const authState = { config: null, session: null, mode: "signin" };

function readAuthSession() {
  try { return JSON.parse(localStorage.getItem("koubo-auth-session") || "null"); }
  catch { localStorage.removeItem("koubo-auth-session"); return null; }
}

function saveAuthSession(session) {
  authState.session = session || null;
  if (session) localStorage.setItem("koubo-auth-session", JSON.stringify(session));
  else localStorage.removeItem("koubo-auth-session");
  const email = session?.user?.email || "";
  $("#auth-entry").textContent = email ? email.split("@")[0].slice(0, 16) : "登录";
}

async function supabaseAuth(path, options = {}) {
  if (!authState.config?.url || !authState.config?.publishableKey) throw new Error("登录配置尚未加载，请刷新页面后重试");
  const response = await fetch(`${authState.config.url.replace(/\/$/, "")}/auth/v1/${path}`, {
    ...options,
    headers: { apikey: authState.config.publishableKey, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "登录服务暂时不可用");
  return data;
}

async function supabaseRest(path, options = {}) {
  if (!authState.config || !authState.session?.access_token) throw new Error("请先登录");
  const response = await fetch(`${authState.config.url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: authState.config.publishableKey,
      Authorization: `Bearer ${authState.session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    const refreshed = await refreshAuthSession(authState.session);
    if (refreshed) return supabaseRest(path, options);
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || "Supabase 数据同步失败");
  return data;
}

async function stableProjectUuid(localId) {
  const input = new TextEncoder().encode(`${authState.session?.user?.id || ""}:${localId}`);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", input)).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function syncProfileToCloud(persona = state.persona) {
  if (!authState.session?.user?.id) return;
  const row = {
    id: authState.session.user.id,
    email: authState.session.user.email || null,
    identity: persona.identity || "",
    content_direction: persona.contentDirection || "",
    target_audience: persona.targetAudience || "",
    personal_story: persona.personalStory || "",
    speaking_style: persona.speakingStyle || "真诚直接",
    creator_dna: persona,
    voice_dna: persona.voiceDNA || null,
    preferences: { preferredPlatform: persona.preferredPlatform, contentGoal: persona.contentGoal, titleStyle: persona.titleStyle, ctaPreference: persona.ctaPreference, forbiddenExpressions: persona.forbiddenExpressions },
  };
  await supabaseRest("profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
}

async function syncProjectToCloud(project) {
  if (!project || !authState.session?.user?.id) return;
  const id = await stableProjectUuid(project.id);
  const row = {
    id, user_id: authState.session.user.id, title: project.title || "未命名项目", status: project.status || "draft",
    source_type: project.source === "自己的想法" ? "idea" : "reference", source_data: {}, evidence: {}, input_data: project.input || {}, script: project.script || null,
    project_data: project, updated_at: project.updatedAt || new Date().toISOString(),
  };
  await supabaseRest("projects?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
}

async function loadCloudUserData() {
  if (!authState.session?.user?.id) return;
  const userId = encodeURIComponent(authState.session.user.id);
  const [profiles, cloudProjects] = await Promise.all([
    supabaseRest(`profiles?id=eq.${userId}&select=*`),
    supabaseRest(`projects?user_id=eq.${userId}&select=project_data&order=updated_at.desc&limit=50`),
  ]);
  const profile = profiles?.[0];
  if (profile?.creator_dna && Object.keys(profile.creator_dna).length) {
    state.persona = { ...emptyPersona, ...profile.creator_dna, voiceDNA: profile.voice_dna || profile.creator_dna.voiceDNA || null };
    localStorage.setItem("koubo-persona", JSON.stringify(state.persona));
  } else if (state.persona.contentDirection || state.persona.targetAudience || state.persona.identity) await syncProfileToCloud();
  const remote = (cloudProjects || []).map((row) => row.project_data).filter((item) => item?.id);
  const local = readProjects();
  if (remote.length) {
    const merged = [...remote, ...local.filter((item) => !remote.some((cloud) => cloud.id === item.id))].slice(0, 50);
    localStorage.setItem("koubo-projects", JSON.stringify(merged));
  } else await Promise.all(local.map((project) => syncProjectToCloud(project)));
  renderPersonaEntry(); renderProjects();
}

async function refreshAuthSession(session) {
  if (!session?.refresh_token) return null;
  try {
    const refreshed = await supabaseAuth("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
    saveAuthSession(refreshed);
    return refreshed;
  } catch { saveAuthSession(null); return null; }
}

function showAuthDialog() {
  $("#auth-signout").hidden = !authState.session;
  $("#auth-password").closest(".field").hidden = Boolean(authState.session);
  $("#auth-email").closest(".field").hidden = Boolean(authState.session);
  $("#auth-submit").hidden = Boolean(authState.session);
  $("#auth-mode").hidden = Boolean(authState.session);
  $("#auth-title").textContent = authState.session ? `已登录：${authState.session.user?.email || "用户"}` : authState.mode === "signup" ? "创建账号" : "登录后继续创作";
  if (!$("#auth-dialog").open) $("#auth-dialog").showModal();
}

function setParserStatus(message, type = "info") {
  const status = $("#parser-status");
  status.textContent = message;
  status.classList.remove("is-loading", "is-success", "is-error");
  if (type !== "info") status.classList.add(`is-${type}`);
}

async function api(path, payload, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  const authHeaders = authState.session?.access_token ? { Authorization: `Bearer ${authState.session.access_token}` } : {};
  try { response = await fetch(path, { method: payload ? "POST" : "GET", headers: { ...(payload ? { "Content-Type": "application/json" } : {}), ...authHeaders }, body: payload ? JSON.stringify(payload) : undefined, signal: controller.signal }); }
  catch (error) { const friendly = new Error(error.name === "AbortError" ? "请求时间有点长，已自动停止。你的内容已经保存。" : "网络连接失败，请稍后重试。"); friendly.code = error.name === "AbortError" ? "AI_TIMEOUT" : "AI_NETWORK_ERROR"; throw friendly; }
  finally { clearTimeout(timer); }
  const data = await response.json().catch(() => ({ ok: false, error: "AI 返回结果不完整，请重新生成。", code: "AI_INVALID_RESPONSE" }));
  if ((!response.ok || data.ok === false) && response.status === 401 && authState.config) {
    const refreshed = await refreshAuthSession(authState.session);
    if (refreshed) return api(path, payload, timeoutMs);
    showAuthDialog();
  }
  if (!response.ok || data.ok === false) { const error = new Error(data.error || "请求失败"); error.code = data.code; error.data = data; throw error; }
  return data;
}

function saveCollection(key, value) {
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.push(value);
  localStorage.setItem(key, JSON.stringify(list.slice(-50)));
}

function recordEvent(event, extra = {}) {
  saveCollection("koubo-events", { event, projectId: state.currentProjectId || "", mode: state.flowMode, timestamp: new Date().toISOString(), ...extra });
}

function readProjects() {
  try { return JSON.parse(localStorage.getItem("koubo-projects") || "[]"); }
  catch { localStorage.removeItem("koubo-projects"); return []; }
}

const emptyCreatorLearning = { version: 1, events: [], updatedAt: null };
function readCreatorLearning() {
  try { return { ...emptyCreatorLearning, ...(JSON.parse(localStorage.getItem("koubo-creator-learning") || "null") || {}) }; }
  catch { localStorage.removeItem("koubo-creator-learning"); return { ...emptyCreatorLearning }; }
}
function writeCreatorLearning(memory) {
  localStorage.setItem("koubo-creator-learning", JSON.stringify({ ...memory, events: (memory.events || []).slice(-80), updatedAt: new Date().toISOString() }));
}
function rememberCandidateLearning(event) {
  const memory = readCreatorLearning();
  memory.events.push({ id: `learning-${Date.now()}-${Math.random().toString(16).slice(2)}`, projectId: state.currentProjectId || "", accepted: false, createdAt: new Date().toISOString(), ...event });
  writeCreatorLearning(memory);
}
function acceptCurrentProjectLearning() {
  const memory = readCreatorLearning();
  let acceptedCount = 0;
  memory.events = memory.events.map((event) => {
    if (event.projectId !== state.currentProjectId || event.accepted) return event;
    acceptedCount += 1;
    return { ...event, accepted: true, acceptedAt: new Date().toISOString() };
  });
  writeCreatorLearning(memory);
  return acceptedCount;
}
function creatorLearningProfile() {
  const accepted = readCreatorLearning().events.filter((event) => event.accepted).slice(-24);
  const reasonRules = { not_speakable: "优先使用第一次朗读就顺口的句式", meaning_wrong: "不得为了表达效果改变用户原意", too_long: "删除绕句和无信息增量的重复表达", not_me: "避免用户已经明确表示不会这样说的表达", manual: "参考用户亲自改写后的句式差异" };
  return {
    styleRules: [...new Set(accepted.flatMap((event) => event.reasons || []).filter(Boolean).map((reason) => reasonRules[reason] || reason))].slice(-12),
    explicitPreferences: [...new Set(accepted.map((event) => event.instruction).filter(Boolean))].slice(-10),
    acceptedRevisionExamples: accepted.filter((event) => event.kind === "local_rewrite" && event.before && event.after).slice(-6).map((event) => ({ reason: event.reason || "用户主动修改", before: event.before.slice(0, 180), after: event.after.slice(0, 180) })),
    sampleSize: accepted.length,
  };
}

function saveProject(status = "draft") {
  if (!state.lastInput || !state.lastScript) return null;
  const projects = readProjects();
  const id = state.currentProjectId || `project-${Date.now()}`;
  const existing = projects.find((item) => item.id === id);
  const project = { id, title: state.lastScript.titles?.[0] || state.lastScript.title || "未命名口播稿", source: state.flowMode === "idea" ? "自己的想法" : (state.selected?.title || "参考爆款"), status, input: state.lastInput, script: state.lastScript, previous_version: state.previousVersion, scriptVariants: state.scriptVariants, abCandidates: state.abCandidates, activeCandidate: state.activeCandidate, generationStatus: state.generationStatus, content_directions: state.contentDirections, selected_direction: state.selectedDirection, confirmed_strategy: state.confirmedStrategy, direction_status: state.directionStatus, revision_memory: state.revisionMemory, shootPlan: existing?.shootPlan || null, updatedAt: new Date().toISOString() };
  const next = [project, ...projects.filter((item) => item.id !== id)].slice(0, 50);
  localStorage.setItem("koubo-projects", JSON.stringify(next));
  state.currentProjectId = id;
  renderProjects();
  syncProjectToCloud(project).catch((error) => console.warn("项目云同步失败", error));
  return project;
}

function syncCurrentScript() {
  if (!state.lastScript || state.viewMode === "outline") return;
  state.lastScript.titles = [$("#result-title").textContent, ...(state.lastScript.titles || []).slice(1)];
  state.lastScript.hook = $("#result-hook").textContent;
}

function cloneVersion(value) { return value ? JSON.parse(JSON.stringify(value)) : null; }
function renderPreviousVersionAction() { $("#restore-previous-button").hidden = !state.previousVersion; }

function projectRows(projects) {
  const labels = { draft: "草稿", ready_to_shoot: "待拍", filmed: "已拍", published: "已发布" };
  return projects.length ? projects.map((item) => `<article class="project-row"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.source)} · ${item.shootPlan?.scheduledAt ? `计划 ${new Date(item.shootPlan.scheduledAt).toLocaleString("zh-CN")}` : new Date(item.updatedAt).toLocaleString("zh-CN")}</span></div><span class="project-status ${item.status}">${labels[item.status] || "草稿"}</span><button class="secondary-button" data-project-id="${item.id}" type="button">${item.status === "draft" ? "继续编辑" : "查看任务"}</button></article>`).join("") : `<p class="empty-projects">还没有项目。完成第一篇稿后会自动保存在这里。</p>`;
}

function readCurrentProject() { return readProjects().find((item) => item.id === state.currentProjectId); }

function updateShootPlan(changes = {}) {
  const projects = readProjects();
  const index = projects.findIndex((item) => item.id === state.currentProjectId);
  if (index < 0) return null;
  const current = projects[index];
  const shootPlan = { scheduledAt: "", prepared: false, filmed: false, published: false, ...(current.shootPlan || {}), ...changes };
  if (shootPlan.published) current.status = "published";
  else if (shootPlan.filmed) current.status = "filmed";
  else current.status = "ready_to_shoot";
  projects[index] = { ...current, shootPlan, updatedAt: new Date().toISOString() };
  localStorage.setItem("koubo-projects", JSON.stringify(projects));
  renderProjects();
  syncProjectToCloud(projects[index]).catch((error) => console.warn("项目云同步失败", error));
  return projects[index];
}

function renderShootPlan(show = false) {
  const project = readCurrentProject();
  const panel = $("#shoot-plan");
  if (!project || (project.status === "draft" && !show)) { panel.hidden = true; return; }
  const plan = { scheduledAt: "", prepared: false, filmed: false, published: false, ...(project.shootPlan || {}) };
  panel.hidden = false;
  $("#shoot-date").value = plan.scheduledAt ? plan.scheduledAt.slice(0, 16) : "";
  const order = ["prepared", "filmed", "published"];
  order.forEach((key) => panel.querySelector(`[data-shoot-task="${key}"]`).classList.toggle("completed", Boolean(plan[key])));
  const done = order.filter((key) => plan[key]).length;
  $("#shoot-progress").textContent = `${done} / 3`;
  $("#shoot-plan-status").textContent = plan.published ? "已发布，这篇任务完成。" : plan.filmed ? "已经拍完，下一步是剪辑并发布。" : plan.scheduledAt ? `已安排：${new Date(plan.scheduledAt).toLocaleString("zh-CN")}` : "先定一个拍摄时间，这篇就不会只躺在“待拍”里。";
}

let cameraStream = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingUrl = "";
let recordingMp4Blob = null;
let recordingAssetId = "";
let recordingDuration = 0;
let recordingEditTemplate = "clean";
let recordingTimer = null;
let recordingStartedAt = 0;
let speechFollower = null;
let prompterIndex = 0;
let prompterDraftLines = [];

function prompterLines() {
  return prompterDraftLines;
}

function splitPrompterText(text = "") {
  return String(text).split(/(?<=[。！？!?])|\n+/).map((line) => line.trim()).filter(Boolean);
}

function currentFinalScriptLines() {
  const hook = $("#result-hook")?.textContent?.trim() || "";
  const body = [...document.querySelectorAll("#script-body .script-section p")].map((paragraph) => paragraph.textContent.trim()).filter(Boolean);
  const bodyLines = splitPrompterText(body.join("\n"));
  const hookLines = splitPrompterText(hook);
  const normalizedBodyStart = normalizeSpeech(bodyLines[0] || "");
  const hookIsRepeated = hookLines.length && normalizedBodyStart && normalizeSpeech(hookLines.join("")) === normalizedBodyStart;
  return [...(hookIsRepeated ? [] : hookLines), ...bodyLines];
}

function renderPrompter(index = prompterIndex) {
  const lines = prompterLines();
  prompterIndex = Math.max(0, Math.min(index, Math.max(0, lines.length - 1)));
  $("#teleprompter-script").innerHTML = lines.length
    ? lines.map((line, lineIndex) => `<p class="${lineIndex === prompterIndex ? "active" : ""}" data-prompter-line="${lineIndex}" contenteditable="true" spellcheck="false">${escapeHtml(line)}</p>`).join("")
    : `<p class="prompter-empty" contenteditable="true" spellcheck="false">还没有导入稿件，请点击“一键导入当前稿”，或直接在这里输入。</p>`;
  $("#teleprompter-script").querySelector(".active")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function syncPrompterEdits() {
  const paragraphs = [...$("#teleprompter-script").querySelectorAll("p")];
  const isEmptyPrompt = paragraphs.length === 1 && paragraphs[0].classList.contains("prompter-empty");
  prompterDraftLines = isEmptyPrompt ? [] : paragraphs.map((paragraph) => paragraph.textContent.trim()).filter(Boolean);
  prompterIndex = Math.min(prompterIndex, Math.max(0, prompterDraftLines.length - 1));
}

function normalizeSpeech(value = "") { return String(value).replace(/[\s，。！？、；：,.!?;:]/g, "").toLowerCase(); }

function followSpeech(transcript) {
  const spoken = normalizeSpeech(transcript);
  if (!spoken) return;
  const lines = prompterLines();
  let bestIndex = prompterIndex;
  let bestScore = 0;
  for (let index = prompterIndex; index <= Math.min(lines.length - 1, prompterIndex + 3); index += 1) {
    const line = normalizeSpeech(lines[index]);
    const probes = [line.slice(0, 4), line.slice(4, 8), line.slice(-5)].filter((part) => part.length >= 3);
    const score = probes.filter((part) => spoken.includes(part)).length;
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  }
  if (bestScore > 0) renderPrompter(bestIndex);
  const current = normalizeSpeech(lines[prompterIndex]);
  if (current && spoken.includes(current.slice(-5))) renderPrompter(prompterIndex + 1);
}

function startSpeechFollower() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { $("#follow-status").textContent = "当前浏览器不支持自动跟随，可手动切换"; return; }
  speechFollower = new Recognition();
  speechFollower.lang = "zh-CN";
  speechFollower.continuous = true;
  speechFollower.interimResults = true;
  speechFollower.onresult = (event) => {
    const transcript = [...event.results].slice(event.resultIndex).map((result) => result[0].transcript).join("");
    $("#follow-status").textContent = transcript ? `听到：${transcript.slice(-12)}` : "正在听你说";
    followSpeech(transcript);
  };
  speechFollower.onerror = () => { $("#follow-status").textContent = "语音跟随暂停，可手动切换"; };
  speechFollower.onend = () => { if (mediaRecorder?.state === "recording") { try { speechFollower.start(); } catch {} } };
  try { speechFollower.start(); $("#follow-status").textContent = "正在听你说"; } catch {}
}

function stopSpeechFollower() {
  if (speechFollower) { speechFollower.onend = null; try { speechFollower.stop(); } catch {} }
  speechFollower = null;
}

function releaseCamera() {
  stopSpeechFollower();
  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = null;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  $("#camera-preview").srcObject = null;
  $("#enable-camera").textContent = "打开摄像头";
  $("#start-recording").disabled = true;
}

function prepareAnotherRecording({ discardCurrent = false } = {}) {
  if (discardCurrent && recordingUrl) {
    URL.revokeObjectURL(recordingUrl);
    recordingUrl = "";
    $("#recording-preview").removeAttribute("src");
    $("#recording-preview").load();
    $("#export-recording").removeAttribute("href");
    $("#export-recording").hidden = true;
    recordingMp4Blob = null;
    recordingAssetId = "";
    recordingDuration = 0;
    $("#quick-editor").hidden = true;
  }
  recordingChunks = [];
  mediaRecorder = null;
  prompterIndex = 0;
  renderPrompter(0);
  $("#recording-preview").hidden = true;
  $("#camera-preview").hidden = !cameraStream;
  $("#camera-placeholder").hidden = Boolean(cameraStream);
  $("#start-recording").hidden = false;
  $("#start-recording").disabled = !cameraStream;
  $("#retake-recording").hidden = true;
  $("#new-recording").hidden = true;
  $("#studio-status").textContent = cameraStream ? (discardCurrent ? "上一条已丢弃，可以重新开始拍摄。" : "上一条仍可导出，准备好后可以再拍一条。") : "请先打开摄像头，再开始新的拍摄。";
}

function renderProjects(showAll = false) {
  const projects = readProjects().slice(0, showAll ? 50 : 3);
  $("#project-list").innerHTML = projectRows(projects);
  $("#my-project-list").innerHTML = projectRows(readProjects());
}

function renderMyReferences() {
  const history = readHistory().map((entry) => entry.source ? entry : { source: entry });
  $("#my-reference-list").innerHTML = history.length ? history.map((entry) => `<article class="saved-reference"><strong>${escapeHtml(entry.source?.content?.title || "已导入参考")}</strong><span>${escapeHtml(entry.source?.author?.name || "用户提供")} · ${new Date(entry.savedAt || entry.source?.sourceStatus?.fetchedAt || Date.now()).toLocaleString("zh-CN")}</span><button class="secondary-button" data-reference-id="${escapeHtml(entry.identity || sourceIdentity(entry.source))}" type="button">查看拆解</button></article>`).join("") : `<p class="empty-projects">还没有导入过参考案例。</p>`;
}

function showModule(module) {
  $("#workspace").hidden = true;
  document.querySelectorAll(".home-module").forEach((node) => { node.hidden = module !== "home"; });
  $("#cases-view").hidden = module !== "cases";
  $("#mine-view").hidden = module !== "mine";
  $("#persona-panel").hidden = module !== "mine";
  document.querySelectorAll("[data-module]").forEach((button) => button.classList.toggle("active", button.dataset.module === module));
  if (module === "cases") { renderProjects(); renderMyReferences(); }
  if (module === "mine") openPersona(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sourceIdentity(source) {
  const noteId = String(source?.url || "").match(/\/(?:explore|discovery\/item)\/([^?/#]+)/)?.[1];
  return noteId || source?.url || `${source?.content?.title || "case"}-${source?.sourceStatus?.fetchedAt || Date.now()}`;
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem("koubo-cases") || "[]"); }
  catch { localStorage.removeItem("koubo-cases"); return []; }
}

function saveHistory(source, analysis, analysisError = "") {
  const identity = sourceIdentity(source);
  const current = readHistory().map((entry) => entry.source ? entry : { source: entry, analysis: null, savedAt: entry.sourceStatus?.fetchedAt });
  const next = [{ identity, source, analysis, analysisError, savedAt: new Date().toISOString() }, ...current.filter((entry) => (entry.identity || sourceIdentity(entry.source)) !== identity)].slice(0, 20);
  localStorage.setItem("koubo-cases", JSON.stringify(next));
  return identity;
}

function removeHistory(identity) {
  const next = readHistory().map((entry) => entry.source ? entry : { source: entry }).filter((entry) => (entry.identity || sourceIdentity(entry.source)) !== identity);
  localStorage.setItem("koubo-cases", JSON.stringify(next));
}

function extractFirstUrl(value) {
  const match = value.match(/https?:\/\/[^\s\u3000]+/i);
  return match ? match[0].replace(/[）)\]】>,，。！？!?"']+$/g, "") : "";
}

function compactNumber(number) {
  return number >= 10000 ? `${(number / 10000).toFixed(number % 10000 === 0 ? 0 : 1)} 万` : String(number);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function clock(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function segmentRole(text = "", index = 0, total = 1) {
  const value = String(text).replace(/\s+/g, " ").trim();
  const progress = total > 1 ? index / (total - 1) : 0;
  if (index === 0) return "开场 Hook";
  if (/今天.*(?:分享|讲|聊)|这条.*(?:会|从)|接下来|分成.*(?:点|步|部分)/.test(value)) return "内容预告";
  if (/第一[，、]|第二[，、]|第三[，、]|首先|其次|最后/.test(value)) return "方法步骤";
  if (/比如|例如|拿.*来说|我(?:以前|最近|当时|平时|就是)|有一次/.test(value)) return "案例/经验";
  if (/涨了|报价|粉丝|播放|点赞|收藏|数据|结果|做到|做出/.test(value) && progress < 0.35) return "结果背书";
  if (progress > 0.82 && /不要|现在|开始|行动|记住|希望|一定|就会|越来越/.test(value)) return "行动收束";
  if (progress > 0.9) return "总结收束";
  if (/因为|所以|意味着|本质|真正|其实|原因|逻辑|换句话说/.test(value)) return "解释/观点";
  if (/可以|建议|需要|记得|试试|做法|方法|步骤|选择|点击|打开|使用|把.*(?:变成|转化|放进)/.test(value)) return "操作建议";
  if (/但是|不过|而且|同时|然后|接着|另外|那/.test(value)) return "承接过渡";
  return "内容展开";
}

function applyVideoRhythm(source) {
  const segments = source?.videoAnalysis?.segments;
  if (!segments?.length) return;
  segments.forEach((segment, index) => {
    segment.type = segmentRole(segment.summary || segment.text, index, segments.length);
  });
}

function hasPersona() { return Boolean(state.persona.contentDirection && state.persona.targetAudience); }

function renderPersonaEntry() {
  const entry = $("#persona-entry");
  if (entry) entry.textContent = hasPersona() ? `${state.persona.identity || "我的创作 DNA"} · 编辑` : "创建我的口播人设";
}

function renderFilters() {
  const categories = ["全部", ...new Set(cases.map((item) => item.category))];
  $("#filters").innerHTML = categories.map((category) => `<button class="filter-button ${state.filter === category ? "active" : ""}" data-filter="${category}" type="button">${category}</button>`).join("");
}

function renderCases() {
  const visible = state.filter === "全部" ? cases : cases.filter((item) => item.category === state.filter);
  $("#case-grid").innerHTML = visible.map((item) => `
    <article class="case-card">
      <div class="card-meta"><span class="low-follower-badge ${item.provenance === "demo" ? "demo-badge" : ""}">${item.provenance === "demo" ? "演示案例" : item.provenance === "collected" ? "真实采集" : "用户提供"}</span><span class="platform-badge">${item.platform}</span><span>${item.provenance === "demo" ? "模拟数据 · " : ""}${compactNumber(item.likes)}赞 · ${compactNumber(item.collects)}收藏</span></div>
      <h3>${item.title}</h3>
      <p class="card-preview">${item.preview}</p>
      <div class="creator-line"><span><strong>${item.creatorName}</strong> · ${item.provenance === "demo" ? "模拟作者" : item.followers ? `${compactNumber(item.followers)}粉` : "粉丝数未获取"}</span>${item.provenance === "demo" || !item.followers || typeof item.explosionRate !== "number" ? "" : `<span class="explosion-rate">突破均值 ${item.explosionRate}×</span>`}</div>
      <div class="tag-list">${item.tags.map((tag) => `<span class="content-tag">${tag}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="outline-button" data-open="${item.id}" type="button">看拆解</button>
        <button class="solid-small" data-write="${item.id}" type="button">照着写</button>
        ${item.provenance !== "demo" ? `<button class="delete-case" data-delete="${escapeHtml(item.historyIdentity || "")}" type="button" aria-label="删除历史案例">删除</button>` : ""}
      </div>
    </article>`).join("");
  $("#empty-state").hidden = visible.length > 0;
}

function openCase(id, openComposer = false) {
  const item = cases.find((entry) => entry.id === id);
  if (!item) return;
  state.selected = item;
  state.flowMode = "reference";
  recordEvent("enter_creation_flow");
  state.followUpAsked = false;
  state.adjustment = null;
  $("#library").hidden = true;
  $(".hero").hidden = true;
  $("#cases-view").hidden = true;
  $("#mine-view").hidden = true;
  $("#workspace").hidden = false;
  $("#detail-platform").textContent = item.platform;
  $("#detail-metrics").textContent = item.provenance === "demo"
    ? `演示数据 · 模拟作者 · ${compactNumber(item.likes)}赞`
    : `${item.creatorName} · ${item.followers ? `${compactNumber(item.followers)}粉` : "粉丝数未获取"} · ${compactNumber(item.likes)}赞 · ${compactNumber(item.collects)}收藏 · ${compactNumber(item.comments)}评论${typeof item.explosionRate === "number" && item.followers ? ` · 突破均值 ${item.explosionRate}×` : ""}`;
  $("#detail-title").textContent = item.title;
  $("#detail-preview").textContent = item.preview;
  $("#detail-tags").innerHTML = item.tags.map((tag) => `<span class="content-tag">${tag}</span>`).join("");
  const evidence = $("#source-evidence");
  if (item.source && item.provenance === "collected") {
    const source = item.source;
    const transcript = source.content?.transcript || "";
    const articleText = source.contentType !== "video" ? String(source.content?.text || "").trim() : "";
    const comments = [...(source.comments || [])].sort((left, right) => (right.likeCount || 0) - (left.likeCount || 0)).slice(0, 5);
    const status = source.sourceStatus || {};
    evidence.hidden = false;
    evidence.innerHTML = `
      <div class="evidence-heading"><strong>真实采集证据</strong><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">查看原内容 ↗</a></div>
      <div class="evidence-stats"><span>页面数据已获取</span><span>${source.contentType === "video" ? transcript ? "视频逐字稿已生成" : "未取得逐字稿" : articleText ? "图文原稿已获取" : "未取得图文原稿"}</span><span>评论采集 ${status.commentsCollected || comments.length}/${status.commentsExpected || source.metrics?.commentsCount || "未知"}</span></div>
      ${source.contentType === "video" && !transcript ? `<button class="secondary-button evidence-retry" id="retry-transcript" type="button">重新获取逐字稿</button>` : ""}
      ${transcript ? `<details class="evidence-details"><summary>查看完整逐字稿 · ${transcript.length}字</summary><p>${escapeHtml(transcript)}</p></details>` : articleText ? `<details class="evidence-details"><summary>查看完整图文原稿 · ${articleText.length}字</summary><p>${escapeHtml(articleText)}</p></details>` : ""}
      ${comments.length ? `<details class="evidence-details"><summary>查看高赞评论证据 · 本次展示${comments.length}条</summary><div class="evidence-comments">${comments.map((comment) => `<blockquote>${escapeHtml(comment.text)}<small>${escapeHtml(comment.author || "用户")} · ${compactNumber(comment.likeCount || 0)}赞</small></blockquote>`).join("")}</div></details>` : ""}
      <small class="evidence-note">采集于 ${new Date(status.fetchedAt).toLocaleString("zh-CN")}；${source.contentType === "video" ? transcript ? "AI 分析基于逐字稿、页面数据和本次可见评论。" : "未取得逐字稿，分析与后续生成均已停止。" : articleText ? "AI 分析基于图文原稿、页面数据和本次可见评论。" : "未取得图文原稿，分析与后续生成均已停止。"}</small>`;
  } else {
    evidence.hidden = true;
    evidence.innerHTML = "";
  }
  $("#analysis-grid").innerHTML = Object.entries(item.analysis).map(([label, copy]) => `<div class="analysis-item"><span>${label}</span><p>${copy}</p></div>`).join("");
  const analysisReady = item.provenance === "demo" || item.analysisAvailable;
  $("#analysis-heading").textContent = analysisReady ? "它为什么能火？" : item.source && !item.sourceReady ? (item.source.contentType === "video" ? "条件不足：缺少逐字稿" : "条件不足：缺少完整图文原稿") : "AI 爆款分析尚未完成";
  const score = Math.min(96, Math.max(60, 72 + Math.min(18, (item.learn || []).length * 4) - (item.difficulty === "困难" ? 10 : item.difficulty === "中等" ? 4 : 0)));
  const creatorAdvice = state.persona.personalStory
    ? `更适合你从“${state.persona.personalStory.slice(0, 46)}${state.persona.personalStory.length > 46 ? "…" : ""}”这段真实经历切入，不要复制原作者身份。`
    : `先补一段你亲历的具体情况，再借它的传播机制；不要复制原作者身份和结果。`;
  $("#decision-summary").innerHTML = `<div class="recommend-score"><span>推荐学习</span><strong>${score}<small>/ 100</small></strong></div><div class="decision-card"><span>最值得学的 3 点</span><ol>${item.learn.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ol></div><div class="decision-card warning"><span>不建议直接复制</span><p>${escapeHtml(item.avoid)}</p></div><div class="decision-card advice"><span>给你的创作建议</span><p>${escapeHtml(creatorAdvice)}</p></div>`;
  $("#retry-analysis-button").hidden = analysisReady || !item.source || !item.sourceReady;
  $("#structure-list").parentElement.hidden = !analysisReady;
  $("#learning-guide").hidden = !analysisReady;
  $("#start-writing").hidden = !analysisReady;
  $("#structure-list").innerHTML = item.structure.map((step) => `<li>${step}</li>`).join("");
  $("#learning-guide").innerHTML = `
    <div class="learning-card"><span>为什么值得学</span><ul>${item.learn.map((point) => `<li>${point}</li>`).join("")}</ul></div>
    <div class="learning-card"><span>不建议直接复制</span><p>${item.avoid}</p></div>
    <div class="learning-card"><span>复刻难度 · <b class="difficulty-stars">${item.difficulty === "简单" ? "★" : "★★"}</b> ${item.difficulty}</span><p>${item.difficultyReason.join(" · ")}</p></div>
    ${item.source?.videoAnalysis?.segments?.length ? `<div class="learning-card rhythm-card"><span>视频节奏</span><div class="rhythm-list">${item.source.videoAnalysis.segments.map((segment, index, segments) => `<p><strong>${segment.time || `${clock(segment.start)}–${clock(segment.end)}`}</strong> ${segment.type || segmentRole(segment.summary || segment.text, index, segments.length)}<small>${escapeHtml(segment.summary || segment.text || "")}</small></p>`).join("")}</div></div>` : ""}`;
  renderCreationReference();
  $("#result").hidden = true;
  $("#timeout-result").hidden = true;
  $("#composer").hidden = !openComposer;
  if (openComposer && !$("#audience").value && state.persona.targetAudience) $("#audience").value = state.persona.targetAudience;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (openComposer) {
    $("#guided-chat").hidden = true;
    setTimeout(() => $("#creation-reference").scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }
}

function startIdeaFlow() {
  state.flowMode = "idea";
  state.currentProjectId = null;
  state.previousVersion = null;
  state.revisionMemory = { acceptedPatterns: [], rejectedPatterns: [], resolvedProblems: [], remainingProblems: [], userFeedback: [] };
  state.selected = { id: "own-idea", title: "从自己的想法开始", structure: ["真实内容切入", "讲清过程或依据", "自然收住"], learn: ["优先使用你的真实素材", "先说具体情况，再给观点", "只保留自然可说的表达"], avoid: "不编造经历、数据或身份，不强行套用爆款结构。", contentStructure: { segments: [] }, viralMechanism: {}, transferableDNA: { reusable: [], conditionallyReusable: [], nonReusable: [] } };
  $(".hero").hidden = true;
  $("#library").hidden = true;
  $("#cases-view").hidden = true;
  $("#mine-view").hidden = true;
  $("#workspace").hidden = false;
  $(".case-detail").hidden = true;
  $("#composer").hidden = false;
  $("#result").hidden = true;
  $("#creation-reference").innerHTML = `<span>从你的想法开始</span><p class="reference-promise">先选择经历、观点或方法，再补充这次真正需要的信息。</p><p class="reference-note">无需先填写完整 Creator DNA；内容方向和目标受众即可。</p>`;
  startGuidedChat();
  recordEvent("enter_creation_flow");
  recordEvent("choose_idea_mode");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCreationReference() {
  if (!state.selected) return;
  const persona = state.persona;
  const segments = (state.selected.contentStructure?.segments || []).map((item) => String(item.role || item.summary || "").trim()).filter(Boolean);
  const structure = segments.length ? segments : (state.selected.structure || []).filter(Boolean);
  const mechanisms = [state.selected.viralMechanism?.hookMechanism, state.selected.viralMechanism?.valuePromise, state.selected.viralMechanism?.emotionalTrigger].filter(Boolean).slice(0, 3);
  const isReference = state.selected.id !== "own-idea";
  const blueprint = structure.length ? structure.slice(0, 3).map((item, index) => `<li><b>${index + 1}.</b> ${escapeHtml(item)}</li>`).join("") : "<li>话题、问题和传播机制</li>";
  $("#creation-reference").innerHTML = `
    <span>${isReference ? "先看这条到底值得借什么" : "AI 会怎么帮你写"}</span>
    ${isReference ? `<p class="reference-promise">可以借：话题、它回答的问题，以及部分传播机制。</p><ol class="reference-blueprint">${blueprint}</ol><p class="reference-note">传播机制：${mechanisms.map(escapeHtml).join(" · ") || "开头吸引力、信息推进和价值交付"}。不能借原作者身份、经历、结果、案例、数据和答案。</p>` : `<p class="reference-promise">先用你的真实内容确定结构，再生成适合你表达的版本。</p>`}
    ${persona.identity ? `<p class="reference-persona"><strong>你的身份：</strong>${escapeHtml(persona.identity)}${persona.targetAudience ? ` · 说给${escapeHtml(persona.targetAudience)}` : ""}</p>` : ""}`;
  $("#rebuild-title").textContent = isReference ? "补充这次真正相关的真实素材" : "把你的内容说清楚";
  $("#rebuild-hint").textContent = isReference
    ? "系统会先结合你的真实素材生成不同内容方向。你确认方向以后，才会生成完整稿。"
    : "填写你的事实、观点、案例或方法，AI 会据此组织成适合口播的内容。";
  $("#material-label").innerHTML = isReference ? "我的口述补充 <em>可选</em>" : "你的内容素材 <b>必填</b>";
  $("#material-hint").textContent = isReference ? "不需要重新写一篇。可选地补一句你的感悟、想强调的部分或你希望的口述语气。" : "写清楚你自己的事实、判断、案例或方法即可。";
  $("#current-material").placeholder = isReference ? "例如：这条我最认同的是___；我想讲得更___；最后我想补一句___。" : "例如：我想讲的核心观点是___；我自己的事实或案例是___；我希望观众最后记住___。";
}

const materialTemplates = {
  experience: { hint: "不用总结大道理，按发生顺序把三个空补上。", text: "以前我___。\n后来因为___，我开始___。\n这件事让我发现：___。" },
  opinion: { hint: "先说大家通常怎么想，再说你为什么不同意。", text: "很多人觉得___。\n但我不同意，因为我亲身经历过___。\n我真正想说的是：___。" },
  method: { hint: "只分享你真的试过的方法，不需要写得很完整。", text: "如果你正在___，先别急着___。\n我试过以后，最有效的是___。\n你今天可以先做：___。" },
};

const guideModes = {
  experience: { label: "讲一段亲身经历", detail: "具体发生了什么？尽量说一个时间、场景、动作或结果。", takeaway: "经历这件事以后，你真正改变了什么看法？" },
  opinion: { label: "说一个不同观点", detail: "大家通常怎么想？你为什么不同意？可以说一个让你产生这个判断的真实观察。", takeaway: "如果观众只记住你一句话，你希望是哪一句？" },
  method: { label: "分享一个有效方法", detail: "这个方法解决了什么具体问题？请说说你亲自怎么做，而不是泛泛建议。", takeaway: "这个方法最适合谁？使用时有什么边界或注意事项？" },
};

function addGuideBubble(role, text) {
  const node = document.createElement("div");
  node.className = `chat-bubble ${role}`;
  node.textContent = text;
  $("#chat-thread").appendChild(node);
}

function renderGuideStep() {
  const guide = state.guide;
  $("#guide-progress").textContent = `第 ${Math.min(guide.step + 1, 4)} 步，共 4 步`;
  $("#guide-choices").innerHTML = "";
  $("#guide-answer").value = "";
  $("#guide-answer-wrap").hidden = guide.step === 0;
  $("#guide-next").hidden = guide.step === 0;
  if (guide.step === 0) {
    addGuideBubble("assistant", "先不写稿。你这次最想讲哪一种内容？");
    $("#guide-choices").innerHTML = Object.entries(guideModes).map(([value, item]) => `<button type="button" data-guide-mode="${value}">${item.label}</button>`).join("");
  } else if (guide.step === 1) {
    addGuideBubble("assistant", "你最想把这段内容讲给哪一类人听？不用写得正式，例如“和我一样想转AI、但迟迟不敢开始的人”。");
  } else if (guide.step === 2) {
    addGuideBubble("assistant", guideModes[guide.mode].detail);
  } else if (guide.step === 3) {
    addGuideBubble("assistant", guideModes[guide.mode].takeaway);
    $("#guide-next").textContent = "帮我整理成素材";
  }
  if (guide.step > 0) setTimeout(() => $("#guide-answer").focus(), 50);
}

function startGuidedChat() {
  state.guide = { step: 0, mode: "", answers: {} };
  $("#guided-chat").hidden = false;
  $("#chat-thread").innerHTML = "";
  $("#guide-next").textContent = "继续";
  renderGuideStep();
}

function finishGuidedChat() {
  const { mode, answers } = state.guide;
  const material = mode === "experience"
    ? `${answers.detail}。这件事我想讲给${answers.audience}。我真正想说的是：${answers.takeaway}。`
    : mode === "opinion"
      ? `很多人对这件事的看法是：${answers.detail}。但我想讲给${answers.audience}的是：${answers.takeaway}。`
      : `我想给${answers.audience}分享一个自己实际用过的方法：${answers.detail}。它的适用边界是：${answers.takeaway}。`;
  $("#current-material").value = material;
  $("#audience").value = answers.audience;
  $("#material-hint").textContent = "这是根据刚才的回答整理出的真实素材。你可以直接修改，确认无误后再生成。";
  addGuideBubble("assistant", "已经整理好了。我没有替你添加经历或结果，请在下面确认内容是否真实。");
  $("#guided-chat").hidden = true;
  $("#current-material").scrollIntoView({ behavior: "smooth", block: "center" });
  $("#current-material").focus();
}

$("#guide-choices").addEventListener("click", (event) => {
  const button = event.target.closest("[data-guide-mode]");
  if (!button) return;
  state.guide.mode = button.dataset.guideMode;
  addGuideBubble("user", guideModes[state.guide.mode].label);
  state.guide.step = 1;
  renderGuideStep();
});

$("#guide-next").addEventListener("click", () => {
  const answer = $("#guide-answer").value.trim();
  if (answer.length < 4) { $("#guide-answer").focus(); return; }
  const key = state.guide.step === 1 ? "audience" : state.guide.step === 2 ? "detail" : "takeaway";
  state.guide.answers[key] = answer;
  addGuideBubble("user", answer);
  if (state.guide.step === 3) return finishGuidedChat();
  state.guide.step += 1;
  renderGuideStep();
});

$("#skip-guide").addEventListener("click", () => { $("#guided-chat").hidden = true; $("#current-material").focus(); });

document.querySelectorAll("[data-material-mode]").forEach((button) => button.addEventListener("click", () => {
  const template = materialTemplates[button.dataset.materialMode];
  document.querySelectorAll("[data-material-mode]").forEach((item) => item.classList.toggle("active", item === button));
  $("#material-hint").textContent = template.hint;
  $("#current-material").value = template.text;
  $("#current-material").focus();
}));

$("#use-personal-example")?.addEventListener("click", () => {
  $("#current-material").value = "我做了4年售后工程师，后来想转向AI产品。以前我以为不会写代码就做不了产品，最近借助AI完成了一个网页。我想说的是：普通人转型，不要等准备好了再开始，先做出一个真实的东西。";
  if (!$("#audience").value) $("#audience").value = "想转向AI产品、但不知道如何开始的普通职场人";
  $("#material-hint").textContent = "这是根据你的经历整理的半成品，你可以直接改成更像自己会说的话。";
  $("#current-material").focus();
});

async function learnVoiceFromDictation(text, statusSelector = "#dictation-status") {
  const status = $(statusSelector);
  if (text.length < 30) return;
  const sample = [state.persona.voiceSample || "", text].filter(Boolean).join("\n").slice(-6000);
  state.persona.voiceSample = sample;
  localStorage.setItem("koubo-persona", JSON.stringify(state.persona));
  syncProfileToCloud().catch((error) => console.warn("Creator DNA 云同步失败", error));
  if (!state.aiConfigured) { if (status) status.textContent = "已转成文字；配置 AI 后会继续学习你的表达习惯。"; return; }
  if (status) status.textContent = "已转成文字，正在学习你的表达习惯……";
  try {
    state.persona.voiceDNA = (await api("/api/voice-dna", { sample })).voiceDNA;
    localStorage.setItem("koubo-persona", JSON.stringify(state.persona));
    syncProfileToCloud().catch((error) => console.warn("Creator DNA 云同步失败", error));
    if (status) status.textContent = "已转成文字，并学习了你的句式、语气和常用表达。";
  } catch (error) {
    if (status) status.textContent = `文字已保留；表达习惯学习失败：${error.message}`;
  }
}

function createRecordedDictation(target, button, status, onTranscript) {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let stopTimer = null;
  return async () => {
    if (recorder?.state === "recording") { recorder.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { status.textContent = "当前浏览器无法录音，请使用 Chrome 后重试。"; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      chunks = [];
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, { ...(preferredType ? { mimeType: preferredType } : {}), audioBitsPerSecond: 64000 });
      const startedAt = Date.now();
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        clearTimeout(stopTimer);
        stream?.getTracks().forEach((track) => track.stop());
        button.classList.remove("is-recording");
        button.textContent = button.id === "dictation-toggle" ? "🎙 开始口述" : "🎙 口述";
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        recorder = null;
        if (!blob.size || Date.now() - startedAt < 800) { status.textContent = "录音太短，请说完一句话后再停止。"; return; }
        status.textContent = "录音完成，正在转成文字……";
        try {
          const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
          const contextVocabulary = [state.persona.identity, state.persona.contentDirection, state.selected?.title, state.selectedDirection?.title, "Codex", "ChatGPT", "DeepSeek", "Cursor", "Supabase", "小红书", "口播爆了么", "AI Agent", "PRD", "MVP"].filter(Boolean).slice(0, 30);
          // 首次启用本地 FunASR 时需要下载模型；后续识别通常会快很多。
          const result = await api("/api/transcribe-audio", { audioBase64: String(dataUrl).split(",")[1], mimeType: blob.type, contextVocabulary }, 1850000);
          const transcript = String(result.normalizedTranscript || result.rawTranscript || "").trim();
          const base = target.value.trim();
          target.value = [base, transcript].filter(Boolean).join(target.tagName === "TEXTAREA" && base ? "\n" : " ");
          target.dispatchEvent(new Event("input", { bubbles: true }));
          const transcriptLayers = { rawTranscript: result.rawTranscript, normalizedTranscript: transcript, structuredEvidence: null, segments: result.segments || [], uncertainTerms: result.uncertainTerms || [], normalizationStatus: result.normalizationStatus };
          if (target.id === "current-material") state.voiceTranscript = transcriptLayers;
          const uncertain = transcriptLayers.uncertainTerms.map((item) => item.original).filter(Boolean);
          status.textContent = result.normalizationStatus === "fallback"
            ? "语音识别完成，但校对服务未完成；已保留原始转写，请确认或修改。"
            : uncertain.length ? `语音识别完成。请确认可能有误的词：${uncertain.join("、")}` : "语音识别完成。请在文本框中确认或修改，也可重新录音。";
          if (onTranscript) await onTranscript(transcript);
        } catch (error) { status.textContent = `转写失败：${error.message}`; }
      };
      recorder.start(1000);
      button.classList.add("is-recording");
      button.textContent = "■ 停止口述";
      status.textContent = "正在录音，说完后再点一次停止。";
      stopTimer = setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, 90000);
    } catch (error) { status.textContent = error.name === "NotAllowedError" ? "麦克风权限未开启。允许权限后再试。" : "录音无法启动，请稍后重试。"; }
  };
}

const recordedMainDictation = createRecordedDictation($("#current-material"), $("#dictation-toggle"), $("#dictation-status"));

$("#dictation-toggle").addEventListener("click", recordedMainDictation);

function addInlineDictation(target) {
  if (target.id === "current-material" || target.closest(".voice-capture") || target.dataset.dictationReady === "true") return;
  target.dataset.dictationReady = "true";
  const control = document.createElement("div");
  control.className = "inline-dictation";
  control.innerHTML = `<button class="secondary-button" type="button">🎙 口述</button><span>可直接说，自动转成文字</span>`;
  target.insertAdjacentElement("afterend", control);
  const button = control.querySelector("button");
  const status = control.querySelector("span");
  status.id = `dictation-status-${target.id || crypto.randomUUID()}`;
  const recordedDictation = createRecordedDictation(target, button, status);
  button.addEventListener("click", recordedDictation);
}

document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach((target) => {
  if (!["post-url"].includes(target.id)) addInlineDictation(target);
});

function resetLibrary() {
  showModule("home");
  $(".case-detail").hidden = false;
  recordEvent("exit_midway");
  window.location.hash = "library";
}

function cleanTopic(value) {
  return value.trim().replace(/[。！？!?]+$/, "");
}

function generateScript(input, mode = "new") {
  const materialParts = input.currentMaterial
    .split(/[。！？!?；;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const topic = cleanTopic(materialParts[0] || input.currentMaterial);
  const persona = state.persona;
  const identity = persona.identity || "";
  const hook = materialParts[0] || input.currentMaterial;
  const sections = materialParts.map((text, index) => ({ label: index === 0 ? "真实切入" : index === materialParts.length - 1 ? "认知收束" : "事情经过", text }));
  if (!sections.length) sections.push({ label: "你的素材", text: input.currentMaterial });
  const shortTitle = topic.length > 24 ? `${topic.slice(0, 24)}……` : topic;
  return { title: shortTitle, titles: [shortTitle], hook, sections, mode, explanation: { borrowed: [], usedUserMaterial: [identity, ...materialParts].filter(Boolean).slice(0, 4) } };
}

function naturalize(text = "") {
  return String(text).replace(/总而言之|综上所述|值得注意的是|不可否认/g, "").replace(/[；;]/g, "。\n").replace(/，(?=.{18,})/g, "。\n").replace(/。{2,}/g, "。").trim();
}

function buildOutline(script) {
  const sections = [{ label: "开头", text: `先说：${script.hook}` }, ...(script.sections || []).map((item) => ({ label: item.label || "内容", text: item.text }))];
  return sections.map((item) => ({ label: item.label, text: String(item.text).split(/[。！？!?\n]+/).map((line) => line.trim()).filter(Boolean).slice(0, 3).map((line) => `- ${line}`).join("\n") }));
}

async function ensureVariant(mode) {
  const key = mode === "natural" ? "spoken" : mode;
  if (state.scriptVariants[key]) return state.scriptVariants[key];
  if (key === "full") return state.lastScript;
  const result = await api("/api/generate-variant", { mode: key, fullScript: state.scriptVariants.full || state.lastScript, currentMaterial: state.lastInput?.currentMaterial, followUpAnswer: state.lastInput?.followUpAnswer, confirmedStrategy: state.confirmedStrategy, creatorDNA: state.persona, creativePreferences: { platform: state.persona.preferredPlatform, goal: state.persona.contentGoal, speakingStyle: state.persona.speakingStyle, titleStyle: state.persona.titleStyle, ctaPreference: state.persona.ctaPreference, forbiddenExpressions: state.persona.forbiddenExpressions } });
  state.scriptVariants[key] = result.script;
  saveProject(readProjects().find((item) => item.id === state.currentProjectId)?.status || "draft");
  return result.script;
}

async function renderScriptMode(mode) {
  if (!state.lastScript) return;
  if (mode !== "outline") mode = "natural";
  state.selectedSection = null;
  state.viewMode = mode;
  document.querySelectorAll("[data-script-mode]").forEach((button) => button.classList.toggle("active", button.dataset.scriptMode === mode));
  $("#variant-edit-note").textContent = mode === "outline" ? "当前查看“提纲开口版”。提纲用于开口提示；需要局部改正文时，请切换到自然口语版。" : "当前查看“自然口语版”。局部修改只影响正文，不会同步改动提纲版。";
  let script;
  try { script = await ensureVariant(mode); }
  catch (error) { $("#copy-status").textContent = `${mode === "natural" ? "自然口语版" : "提纲版"}生成失败：${error.message}`; mode = "natural"; state.viewMode = "natural"; script = state.scriptVariants.spoken || state.scriptVariants.full || state.lastScript; document.querySelectorAll("[data-script-mode]").forEach((button) => button.classList.toggle("active", button.dataset.scriptMode === "natural")); }
  const isOutline = mode === "outline";
  const hook = script.hook || "";
  const sourceSections = script.sections || [];
  $("#hook-card").hidden = isOutline;
  $("#result-hook").textContent = hook;
  const bodySections = !isOutline && sourceSections[0]?.text?.trim() === hook?.trim() ? sourceSections.slice(1) : sourceSections;
  $("#script-body").innerHTML = bodySections.map((section, index) => `<div class="script-section" data-section-index="${index}"><div class="script-label">${escapeHtml(section.label)}</div><p>${escapeHtml(section.text)}</p></div>`).join("");
  if (mode === "natural") recordEvent("spoken_viewed");
  if (mode === "outline") recordEvent("outline_viewed");
}

async function renderResult(script, input, status = "success") {
  state.lastScript = script;
  const titles = script.titles?.length ? script.titles : [script.title];
  $("#result-title").textContent = titles[0];
  $("#title-candidates").innerHTML = titles.slice(1, 3).map((title) => `<button type="button">备选：${title}</button>`).join("");
  $("#result-duration").textContent = `约 ${input.duration} 秒`;
  $("#blind-test").hidden = state.abCandidates.length !== 2 || status !== "success";
  document.querySelectorAll("[data-candidate]").forEach((button) => button.classList.toggle("active", button.dataset.candidate === state.activeCandidate));
  if (status === "fallback" && !state.scriptVariants.spoken) state.scriptVariants.spoken = script;
  await renderScriptMode("natural");
  const explanation = script.explanation || { borrowed: [], usedUserMaterial: [state.persona.identity || "你的当前观点", state.persona.personalStory ? "个人经历" : "本次素材"] };
  const borrowed = explanation.borrowed?.length ? explanation.borrowed : ["没有硬套原结构，只保留适合本次内容的传播原则"];
  const used = explanation.usedUserMaterial?.length ? explanation.usedUserMaterial : ["本次真实素材"];
  const changes = Array.isArray(script.changeSummary) ? script.changeSummary.filter(Boolean) : [];
  const editExplanation = script.editExplanation || null;
  const preserved = editExplanation?.preserve?.length ? editExplanation.preserve : ["真实事实"];
  const pathLabels = editExplanation?.executionPath?.length ? editExplanation.executionPath.join(" → ") : "";
  $("#ai-explanation").innerHTML = changes.length
    ? `<span>这次主要调整了 ${changes.length} 处</span><div class="ai-explanation-grid"><p><strong>为什么这样改</strong><br>${pathLabels ? `${escapeHtml(pathLabels)}<br>` : ""}${changes.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</p><p><strong>保持不变</strong><br>${preserved.map(escapeHtml).join("、")}</p></div>`
    : `<span>这次是怎么重组的</span><div class="ai-explanation-grid"><p><strong>借了什么</strong><br>${borrowed.map(escapeHtml).join("、")}</p><p><strong>用了你的哪些素材</strong><br>${used.map(escapeHtml).join("、")}</p></div>`;
  const gap = state.evidenceResearch?.gap;
  if (gap?.type && gap.type !== "NONE" && gap.importance === "HIGH") {
    recordEvent("evidence_gap_detected", { gapType: gap.type, researchable: gap.researchable });
    const actions = gap.researchable
      ? `<button type="button" class="primary-button" data-evidence-action="research">帮我查一下</button><button type="button" class="secondary-button" data-evidence-action="self">我自己补充</button><button type="button" class="secondary-button" data-evidence-action="skip">先不补</button>`
      : `<button type="button" class="secondary-button" data-evidence-action="self">我自己补充</button><button type="button" class="secondary-button" data-evidence-action="skip">先不补</button>`;
    $("#ai-explanation").insertAdjacentHTML("beforeend", `<section class="evidence-research-panel" id="evidence-research-panel"><strong>这里缺少具体证据</strong><p>${escapeHtml(gap.description || "如果补充可验证的信息，这段会更有说服力。")}</p><div class="evidence-actions">${actions}</div><div id="evidence-research-results"></div></section>`);
    recordEvent("evidence_research_shown", { gapType: gap.type, researchable: gap.researchable });
  }
  const references = (script.evidenceReferences || state.externalEvidence || []).filter((item) => item.userConfirmed === true);
  if (references.length) $("#ai-explanation").insertAdjacentHTML("beforeend", `<section class="evidence-references"><strong>参考资料 ${references.length} 条</strong>${references.map((item) => `<p>${escapeHtml(item.sourceTitle || item.publisher || item.claim)}<br><small>${escapeHtml(item.publisher || "")}${item.publishedAt ? ` · ${escapeHtml(item.publishedAt)}` : ""}</small><br><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">查看来源 ↗</a></p>`).join("")}</section>`);
  $("#composer").hidden = true;
  $("#result").hidden = false;
  $("#copy-status").textContent = "";
  renderPreviousVersionAction();
  $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  state.generationStatus = status;
  $("#fallback-banner").hidden = status !== "fallback";
  saveProject("draft");
  if (status === "success") recordEvent("generation_success");
  $("#asset-save-prompt").hidden = state.guide.mode !== "experience" || !input.currentMaterial;
}

$("#ai-explanation").addEventListener("click", async (event) => {
  const action = event.target.closest("[data-evidence-action]");
  const candidateButton = event.target.closest("[data-evidence-candidate]");
  if (!action && !candidateButton) return;
  const panel = $("#evidence-research-panel");
  const resultsNode = $("#evidence-research-results");
  if (action?.dataset.evidenceAction === "skip") {
    recordEvent("external_evidence_rejected", { reason: "skip_research" });
    panel?.remove();
    return;
  }
  if (action?.dataset.evidenceAction === "self") {
    const detail = window.prompt("请补充你确定的真实经历或细节：", "");
    if (detail?.trim()) {
      $("#follow-up-question").textContent = "你自己补充的真实证据";
      $("#follow-up-answer").value = detail.trim();
      $("#follow-up").hidden = false;
      $("#follow-up-answer").focus();
    }
    return;
  }
  if (action?.dataset.evidenceAction === "research") {
    recordEvent("evidence_research_clicked", { gapType: state.evidenceResearch?.gap?.type });
    action.disabled = true; resultsNode.innerHTML = `<p class="evidence-loading">正在查找公开信息...</p>`;
    try {
      const found = await api("/api/content-editor/evidence-research", { projectId: state.currentProjectId || "", section: state.evidenceResearch?.gap?.affectedSection || "", userStatement: state.evidenceResearch?.userStatement || state.lastInput?.currentMaterial || "", evidenceGap: state.evidenceResearch?.gap, existingEvidence: state.externalEvidence }, 90000);
      state.evidenceResearch.results = found.results || [];
      recordEvent("evidence_research_result", { gapType: found.gapType, resultCount: found.results?.length || 0 });
      resultsNode.innerHTML = found.results?.length ? found.results.map((item, index) => `<article class="evidence-candidate"><strong>${escapeHtml(item.entityName || item.sourceTitle || item.claim)}</strong><p>${escapeHtml(item.claim)}</p><small>来源：${escapeHtml(item.publisher || item.sourceTitle)}${item.publishedAt ? ` · ${escapeHtml(item.publishedAt)}` : ""}</small><p><b>可能相关原因：</b>${escapeHtml(item.matchReason || "与当前证据缺口相关")}</p><div class="evidence-actions">${found.gapType === "FUZZY_MEMORY" ? `<button type="button" class="primary-button" data-evidence-candidate="${index}" data-confirmation-type="memory_match">就是这个</button>` : ""}<button type="button" class="secondary-button" data-evidence-candidate="${index}" data-confirmation-type="external_only">这个信息可以用</button><button type="button" class="secondary-button" data-evidence-candidate="${index}" data-confirmation-type="reject">不相关</button></div></article>`).join("") : `<p>没有找到足够可信的候选。</p>`;
    } catch (error) { resultsNode.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`; action.disabled = false; }
    return;
  }
  const index = Number(candidateButton.dataset.evidenceCandidate);
  const candidate = state.evidenceResearch?.results?.[index];
  const confirmationType = candidateButton.dataset.confirmationType;
  if (!candidate) return;
  if (confirmationType === "reject") {
    recordEvent("external_evidence_rejected", { evidenceId: candidate.id });
    candidateButton.closest(".evidence-candidate")?.remove();
    return;
  }
  candidateButton.disabled = true;
  try {
    const confirmed = await api("/api/content-editor/evidence-confirm", { candidate, confirmationType, userStatement: state.evidenceResearch?.userStatement || "" });
    state.externalEvidence = [...state.externalEvidence.filter((item) => item.id !== confirmed.externalEvidence.id), confirmed.externalEvidence];
    recordEvent("external_evidence_confirmed", { evidenceId: confirmed.externalEvidence.id, confirmationType });
    const affected = state.evidenceResearch?.gap?.affectedSection || "";
    let sectionIndex = (state.lastScript.sections || []).findIndex((section) => affected && (section.label.includes(affected) || affected.includes(section.label)));
    if (sectionIndex < 0) sectionIndex = 0;
    resultsNode.innerHTML = `<p class="evidence-loading">证据已确认，正在只修改受影响段落...</p>`;
    const revised = await api("/api/content-editor/evidence-revise", { currentScript: state.lastScript, sectionIndex, userEvidence: [{ id: "USER_E1", type: "USER_EVIDENCE", text: state.evidenceResearch?.userStatement || "" }], externalEvidence: [confirmed.externalEvidence], memoryMatch: confirmed.memoryMatch, editorialPlan: state.evidenceResearch?.editorialPlan }, 120000);
    if (revised.revisionRejected) throw new Error("补证修改未通过真实性校验，已保留原稿");
    state.evidenceResearch = null;
    state.scriptVariants = { ...state.scriptVariants, full: revised.script, spoken: revised.script };
    recordEvent("revision_with_external_evidence", { evidenceId: confirmed.externalEvidence.id, validation: revised.validation?.status });
    await renderResult(revised.script, state.lastInput || { duration: 60 }, "success");
  } catch (error) { resultsNode.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`; candidateButton.disabled = false; }
});

async function uploadVideoAsset(file) {
  const response = await fetch(`/api/video-assets?name=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
  const data = await response.json().catch(() => ({ ok: false, error: "素材上传失败" }));
  if (!response.ok) throw new Error(data.error || "素材上传失败");
  return data.asset;
}

async function pollVideoJob(jobId) {
  while (true) {
    const data = await api(`/api/video-jobs?id=${encodeURIComponent(jobId)}`);
    $("#video-status").textContent = data.job.label || "正在生成";
    if (data.job.status === "complete") return data.job;
    if (data.job.status === "failed") throw new Error(data.job.error || "视频生成失败");
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
}

$("#video-assets").addEventListener("change", (event) => {
  const files = [...event.target.files];
  $("#asset-summary").textContent = files.length ? `已选择 ${files.length} 个真实素材：${files.map((file) => file.name).join("、")}` : "未添加素材时，将使用当前产品界面和文字卡片完成验证。";
});

$("#generate-video").addEventListener("click", async () => {
  if (!state.lastScript) return;
  const button = $("#generate-video");
  const files = [...$("#video-assets").files];
  button.disabled = true;
  $("#video-preview").hidden = true;
  try {
    $("#video-status").textContent = files.length ? "正在上传真实素材" : "正在整理画面";
    const assets = [];
    for (const file of files) assets.push(await uploadVideoAsset(file));
    $("#video-status").textContent = "正在生成旁白";
    const created = await api("/api/video-jobs", { script: state.scriptVariants.spoken || state.lastScript, assets, targetDuration: Number(state.lastInput?.duration || 60) });
    const job = await pollVideoJob(created.job.id);
    $("#result-video").src = job.videoUrl;
    $("#download-video").href = job.videoUrl;
    $("#video-preview").hidden = false;
    $("#video-status").textContent = `生成完成 · ${Math.round(job.duration || 0)} 秒 · 1080 × 1920`;
  } catch (error) {
    $("#video-status").textContent = `生成失败：${error.message}`;
  } finally { button.disabled = false; }
});

async function runGeneration(mode = "new") {
  const input = state.lastInput;
  if (!input) return;
  const button = $(".generate-button");
  button.classList.add("is-loading");
  button.disabled = true;
  state.generationStatus = "generating";
  recordEvent(mode === "new" ? "generation_started" : "generation_retry");
  localStorage.setItem("koubo-pending-input", JSON.stringify({ input, flowMode: state.flowMode, selectedId: state.selected?.id, creatorDNA: state.persona, savedAt: new Date().toISOString() }));
  const stages = ["正在理解你的内容", "正在匹配爆款结构", "正在结合你的真实经历", "正在调整成自然口语", "正在生成最终版本"];
  const isRefining = mode === "refine" || mode === "personal";
  let pendingPreviousVersion = null;
  let stageIndex = 0;
  $("#generation-overlay").hidden = isRefining;
  $("#result-refining").hidden = !isRefining;
  $("#generation-stage").textContent = stages[0];
  $("#refining-stage").textContent = "正在按你的要求改写";
  const stageTimer = setInterval(() => {
    stageIndex = Math.min(stageIndex + 1, stages.length - 1);
    $("#generation-stage").textContent = stages[stageIndex];
    if (isRefining) $("#refining-stage").textContent = ["正在读取当前稿件", "正在理解你的修改方向", "正在保留有效内容", "正在调整表达方式", "正在生成修改后的版本"][stageIndex];
  }, 1100);
  try {
    let script;
    if (isRefining) {
      syncCurrentScript();
      pendingPreviousVersion = { lastScript: cloneVersion(state.lastScript), scriptVariants: cloneVersion(state.scriptVariants), viewMode: state.viewMode, activeCandidate: state.activeCandidate };
    }
    if (state.aiConfigured) {
      const selected = state.selected || input.referenceContext || {};
      const referenceText = String(selected.source?.content?.transcript || selected.source?.content?.text || selected.preview || input.referenceMaterial?.text || "").slice(0, 12000);
      const directionLocked = Boolean(state.selectedDirection && state.confirmedStrategy);
      const sourceFraming = state.confirmedStrategy?.sourceDistinctiveFraming || {};
      const visibleDraft = state.viewMode === "outline" ? state.scriptVariants.outline : (state.scriptVariants.spoken || state.lastScript);
      const payload = { contentStructure: directionLocked ? {} : (selected.contentStructure || { segments: (selected.structure || []).map((role) => ({ role })) }), viralMechanism: directionLocked ? { allowedMechanisms: state.confirmedStrategy.allowedMechanisms || [] } : (selected.viralMechanism || {}), transferableDNA: directionLocked ? {} : (selected.transferableDNA || { reusable: selected.learn || [], conditionallyReusable: [], nonReusable: selected.avoid ? [selected.avoid] : [] }), identityDNA: { identity: state.persona.identity, contentDirection: state.persona.contentDirection, targetAudience: state.persona.targetAudience, personalStory: state.persona.personalStory }, creativePreferences: { platform: state.persona.preferredPlatform, goal: state.persona.contentGoal, speakingStyle: state.persona.speakingStyle, titleStyle: state.persona.titleStyle, ctaPreference: state.persona.ctaPreference, forbiddenExpressions: state.persona.forbiddenExpressions }, voiceDNA: state.persona.voiceDNA || { declaredStyle: state.persona.speakingStyle }, creatorMemory: [state.persona.personalStory, state.persona.voiceSample].filter(Boolean), adaptationMode: directionLocked ? "direction_locked" : state.flowMode === "reference" && referenceText ? "reference_rebuild" : "original", referenceMaterial: { title: directionLocked ? "" : (selected.title || input.referenceMaterial?.title || ""), text: directionLocked ? "" : referenceText }, confirmedUserConclusion: state.confirmedStrategy?.confirmedUserConclusion || state.selectedDirection?.userConclusion || null, confirmedDirection: state.selectedDirection, confirmedStrategy: state.confirmedStrategy, sourceDistinctiveFraming: sourceFraming, topicCommonWords: [state.directionAnalysis?.sourceDNA?.topic, state.directionAnalysis?.sourceDNA?.question].filter(Boolean), userApprovedSourceFraming: state.confirmedStrategy?.userApprovedSourceFraming === true, previousDraft: isRefining ? visibleDraft : null, currentMaterial: input.currentMaterial, followUpAnswer: input.followUpAnswer || "", audience: input.audience, duration: input.duration, adjustment: state.adjustment || (mode === "new" ? "" : mode), adjustmentScope: isRefining ? (state.adjustmentScope || "full") : "full", revisionMemory: state.revisionMemory };
      payload.creatorLearning = creatorLearningProfile();
      $(isRefining ? "#refining-stage" : "#generation-stage").textContent = "DeepSeek 正在生成并统一审校";
      const clientRequestId = globalThis.crypto?.randomUUID?.() || `generation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const generated = await api("/api/generate", { ...payload, provider: "deepseek", clientRequestId }, 120000);
      state.revisionMemory = generated.revisionMemory || state.revisionMemory;
      const gap = generated.meta?.editorialDiagnosis?.evidenceGap || null;
      state.evidenceResearch = gap ? { gap, editorialPlan: generated.meta?.editorialDiagnosis?.editorialPlan || [], userStatement: input.currentMaterial } : null;
      script = generated.script;
      if (script && generated.meta?.editorialDiagnosis) script.editExplanation = { preserve: generated.meta.editorialDiagnosis.editContract?.preserve || ["facts"], executionPath: generated.meta.editorialDiagnosis.executionPath || [] };
      state.abCandidates = [];
    } else {
      await new Promise((resolve) => setTimeout(resolve, 550));
      script = generateScript(input, mode);
    }
    if (isRefining && pendingPreviousVersion) state.previousVersion = pendingPreviousVersion;
    else if (mode === "new") state.previousVersion = null;
    state.scriptVariants = { full: script, spoken: script, outline: null };
    if (state.selectedDirection) state.directionStatus = "GENERATED";
    await renderResult(script, input, "success");
    localStorage.removeItem("koubo-pending-input");
    saveCollection("koubo-generationSessions", { id: Date.now(), caseId: state.selected?.id || state.currentProjectId || "own-idea", currentMaterial: input.currentMaterial, followUpAnswer: input.followUpAnswer || "", mode, usedRealAI: state.aiConfigured, createdAt: new Date().toISOString() });
  } catch (error) {
    if (error.code === "EDITORIAL_INPUT_REQUIRED") {
      const questions = error.data?.editorialQuestions || [];
      $("#follow-up-question").textContent = questions.map((question, index) => questions.length > 1 ? `${index + 1}. ${question}` : question).join("\n") || "能补充一个真实发生过的细节吗？";
      $("#follow-up").hidden = false;
      $("#follow-up-answer").value = "";
      $("#follow-up-answer").focus();
      if (isRefining) { $("#copy-status").textContent = "当前稿已保留。补充这个细节后，我再决定怎么改。"; $("#result").hidden = false; }
      else { $("#form-error").textContent = "素材不足以安全完成这次编辑，请补充下面这个真实细节。"; $("#composer").hidden = false; }
    } else if (["GENERATION_TIMEOUT", "AI_TIMEOUT"].includes(error.code)) {
      state.structureDraft = error.data?.structureDraft || null;
      const fallback = generateScript(input, "timeout-fallback");
      state.scriptVariants = { full: fallback, spoken: fallback, outline: null };
      recordEvent("generation_timeout", { errorType: "timeout" });
      recordEvent("generation_fallback", { errorType: "timeout" });
      await renderResult(fallback, input, "fallback");
    } else {
      const message = `生成失败：${error.message}。`;
      if (isRefining) {
        $("#copy-status").textContent = `${message}当前稿件已保留，请重试。`;
        $("#composer").hidden = true;
        $("#result").hidden = false;
      } else {
        $("#form-error").textContent = `${message}你的输入已保留，可以重新生成。`;
        $("#composer").hidden = false;
      }
    }
  }
  clearInterval(stageTimer);
  $("#generation-overlay").hidden = true;
  $("#result-refining").hidden = true;
  button.classList.remove("is-loading");
  button.disabled = false;
}

function fullScriptText() {
  const title = $("#result-title").textContent;
  const hook = $("#result-hook").textContent;
  const body = [...document.querySelectorAll("#script-body .script-section p")].map((paragraph) => paragraph.textContent.trim()).filter(Boolean);
  const continuous = [hook, ...body.filter((text, index) => !(index === 0 && text === hook))].filter(Boolean).join("\n\n");
  return `标题：${title}\n\n${continuous}`;
}

function importedToCard(source, analysis = null, analysisError = "") {
  const hasTranscript = Boolean(String(source.content?.transcript || "").trim());
  const hasArticleText = source.contentType !== "video" && String(source.content?.text || "").trim().length >= 30;
  const sourceReady = hasTranscript || hasArticleText;
  if (!sourceReady) {
    analysis = null;
    analysisError = analysisError || (source.contentType === "video" ? "未取得逐字稿，分析条件不足，已停止爆款分析和后续生成。" : "未取得完整图文原稿，分析条件不足，已停止爆款分析和后续生成。");
  }
  const title = source.content.title || source.content.text.slice(0, 38) || "用户提供的爆款内容";
  const likes = source.metrics.likes || 0;
  const followers = source.author.followers || 0;
  const fallbackAnalysis = {
    "分析状态": "AI 爆款分析尚未完成，以下内容不能作为‘为什么爆’的结论。",
    "失败原因": analysisError || "模型分析尚未成功返回；可点击下方按钮重新分析。",
    "已保留素材": `正文 ${source.content.text?.length || 0} 字 · 逐字稿 ${source.content.transcript?.length || 0} 字 · ${source.comments?.length || 0} 条公开评论样本`,
  };
  const dna = analysis?.viralMechanism;
  const genericSteps = /^(开篇|开头|第[一二三四五六七八九十\d]+部分|内容展开|内容切入|结尾|收尾)$/;
  const analyzedStructure = (analysis?.contentStructure?.segments || []).map((segment) => String(segment.role || segment.summary || "").trim()).filter(Boolean);
  const rhythmStructure = [];
  for (const [index, segment] of (source.videoAnalysis?.segments || []).entries()) {
    const role = segmentRole(segment.summary || segment.text, index, source.videoAnalysis.segments.length);
    if (rhythmStructure.at(-1) !== role) rhythmStructure.push(role);
  }
  const structure = analyzedStructure.length >= 3 && !analyzedStructure.some((step) => genericSteps.test(step))
    ? analyzedStructure
    : rhythmStructure.length >= 3 ? rhythmStructure : ["具体场景切入", "展开核心信息", "给出可执行下一步"];
  const provenance = ["managed_browser", "browser_extension"].includes(source.sourceStatus?.source) ? "collected" : "provided";
  return {
    id: `imported-${Date.now()}`, title, category: "历史案例", platform: "小红书", creatorName: source.author.name || "无法获取",
    followers, likes, comments: source.metrics.commentsCount || 0, collects: source.metrics.collects || 0, averageLikes: 0,
    explosionRate: null, popularityCredibility: analysis?.popularityCredibility || { level: "热门内容", reason: "缺少账号历史基线" },
    metrics: `${compactNumber(likes)}赞`, tags: [provenance === "collected" ? "真实采集" : "用户提供", "单篇解析", source.contentType === "video" ? "视频" : "图文"],
    preview: source.contentType === "video" ? (source.content.transcript || source.content.text) : (source.content.text || source.content.transcript) || "正文无法获取，请使用手动内容补充。",
    analysis: analysis ? { "分析范围": analysis.analysisScope === "video_transcript" ? "基于视频逐字稿、正文、互动数据和公开评论样本" : source.contentType === "video" ? "视频逐字稿未获取，当前仅基于帖子正文、互动数据和公开评论样本" : "基于完整图文原稿、互动数据和公开评论样本", "为什么爆": analysis.whyViral.join("；"), "传播机制": [dna?.hookMechanism, dna?.valuePromise, dna?.trustMechanism].filter(Boolean).join("；"), "表达风格": [analysis.deliveryStyle?.languageTone, analysis.deliveryStyle?.sentenceRhythm, analysis.deliveryStyle?.emphasisPattern].filter(Boolean).join("；") || (source.contentType === "video" ? "逐字稿不足，无法判断" : "图文内容不包含口播表达证据"), "情绪与节奏": [analysis.deliveryStyle?.emotionCurve, analysis.deliveryStyle?.pacing].filter(Boolean).join("；") || (source.contentType === "video" ? "逐字稿不足，无法判断" : "图文内容不包含口播节奏证据"), "评论证据": `已分析 ${analysis.commentInsight?.sampleSize ?? source.comments.length} 条公开评论；最强共鸣：${analysis.commentInsight?.strongestResonance || "暂无明确证据"}`, "指标信号": analysis.metricInsight?.reason || "数据不足" } : fallbackAnalysis,
    structure,
    learn: analysis?.transferableDNA?.reusable?.length ? analysis.transferableDNA.reusable : sourceReady ? ["这是你主动选择的真实参考内容", hasTranscript ? "逐字稿已取得，可继续验证传播结构" : "图文原稿已取得，可继续验证传播结构", "只迁移机制，不复制原文"] : ["页面数据已保留", source.contentType === "video" ? "尚未取得逐字稿" : "尚未取得完整图文原稿", "补齐原稿后才能分析和生成"],
    avoid: analysis?.transferableDNA?.nonReusable?.join("；") || "只迁移传播机制，不复制原作者具体措辞、经历或身份。",
    difficulty: analysis?.difficulty?.level || "待分析", difficultyReason: analysis?.difficulty?.reasons || ["取决于内容完整度"], source,
    provenance, contentStructure: analysis?.contentStructure || { segments: structure.map((role) => ({ role })) }, viralMechanism: analysis?.viralMechanism || {}, transferableDNA: analysis?.transferableDNA || { reusable: [], conditionallyReusable: [], nonReusable: [] }, analysisMeta: analysis?._meta || null, analysisAvailable: sourceReady && Boolean(analysis), analysisError, hasTranscript, sourceReady,
  };
}

function transcriptRhythm(transcript) {
  const rows = transcript.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const timed = rows.filter((line) => /^\d{2}:\d{2}/.test(line)).slice(0, 6);
  if (!timed.length) return null;
  const types = ["强 Hook", "放大痛点", "个人经历", "核心观点", "解决方案", "总结 + CTA"];
  return { segments: timed.map((line, index) => ({ time: line.match(/^\d{2}:\d{2}(?:-\d{2}:\d{2})?/)?.[0] || "", type: types[index] || "内容推进", summary: line.replace(/^\d{2}:\d{2}(?:-\d{2}:\d{2})?\s*/, "") })) };
}

async function useImportedSource(source, suppliedAnalysis = null) {
  const hasTranscript = Boolean(String(source.content?.transcript || "").trim());
  const sourceReady = hasTranscript || (source.contentType !== "video" && String(source.content?.text || "").trim().length >= 30);
  if (!sourceReady) {
    const analysisError = source.contentType === "video" ? "未取得逐字稿，分析条件不足，已停止爆款分析和后续生成。" : "未取得完整图文原稿，分析条件不足，已停止爆款分析和后续生成。";
    const item = importedToCard(source, null, analysisError);
    const identity = saveHistory(source, null, analysisError);
    item.historyIdentity = identity;
    item.id = `history-${identity}`;
    const existingIndex = cases.findIndex((entry) => entry.historyIdentity === identity);
    if (existingIndex >= 0) cases.splice(existingIndex, 1);
    cases.unshift(item);
    state.parsedCase = source;
    setParserStatus(analysisError, "error");
    renderFilters(); renderCases(); openCase(item.id);
    return;
  }
  setParserStatus(state.aiConfigured ? "已获取内容，AI 正在分析为什么爆……" : "已获取内容；真实 AI 未配置，先用基础拆解继续。", state.aiConfigured ? "loading" : "info");
  let analysis = suppliedAnalysis;
  let analysisError = source.sourceStatus?.analysisError || "";
  if (state.aiConfigured && !analysis && !analysisError) {
    try { const result = await api("/api/analyze", { case: source }); analysis = { ...result.analysis, _meta: result.meta }; }
    catch (error) { analysisError = error.message; setParserStatus(`内容已获取，但 AI 分析失败：${error.message}`, "error"); }
  }
  applyVideoRhythm(source);
  const item = importedToCard(source, analysis, analysisError);
  const identity = saveHistory(source, analysis, analysisError);
  item.historyIdentity = identity;
  item.id = `history-${identity}`;
  const existingIndex = cases.findIndex((entry) => entry.historyIdentity === identity);
  if (existingIndex >= 0) cases.splice(existingIndex, 1);
  cases.unshift(item);
  setParserStatus(analysis?._meta?.cacheHit ? "已从缓存载入爆款分析。" : analysis ? "爆款分析已完成。" : "内容已导入，可继续创作。", "success");
  state.parsedCase = source;
  renderFilters(); renderCases(); openCase(item.id);
}

async function waitForLongVideoTranscript(source) {
  const jobId = source.sourceStatus?.transcriptionJobId;
  if (!jobId || source.content?.transcript) return source;
  const deadline = Date.now() + 15 * 60 * 1000;
  const labels = { queued: "长视频已进入转写队列", download: "正在读取长视频", transcribing: "正在尝试云端识别", local_asr: "云端不可用，正在使用本地 FunASR 识别", cloud_upload_asr: "正在使用备用云端识别", complete: "逐字稿已完成" };
  while (Date.now() < deadline) {
    const result = await api(`/api/transcription-jobs?id=${encodeURIComponent(jobId)}`);
    const job = result.job;
    setParserStatus(`${labels[job.stage] || "正在处理长视频"}${job.progress != null ? ` · ${job.progress}%` : ""}，可以继续停留在此页面等待……`, "loading");
    if (job.status === "complete" && job.case) return job.case;
    if (job.status === "failed") { const error = new Error(job.error?.message || "长视频逐字稿获取失败"); error.code = job.error?.code || "TRANSCRIPTION_FAILED"; throw error; }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  const error = new Error("长视频仍在后台处理，本次页面等待已停止；稍后可点击“重新获取逐字稿”继续");
  error.code = "ASR_TIMEOUT";
  throw error;
}

function loadHistoryCases() {
  const history = readHistory().map((entry) => entry.source ? entry : { source: entry, analysis: null, savedAt: entry.sourceStatus?.fetchedAt });
  for (const entry of history.reverse()) {
    if (!entry.source?.content) continue;
    const identity = entry.identity || sourceIdentity(entry.source);
    const item = importedToCard(entry.source, entry.analysis, entry.analysisError || "");
    item.id = `history-${identity}`;
    item.historyIdentity = identity;
    item.savedAt = entry.savedAt;
    cases.unshift(item);
  }
}

$("#link-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  const url = extractFirstUrl($("#post-url").value.trim());
  if (!url) {
    setParserStatus("这段内容里没有找到链接，请确认包含以 http:// 或 https:// 开头的地址。", "error");
    $("#post-url").focus();
    return;
  }
  button.disabled = true;
  setParserStatus("已识别分享文案中的链接，正在读取公开内容……", "loading");
  $("#manual-fallback").hidden = true;
  try {
    const cached = readHistory().find((entry) => (entry.source?.url || entry.url) === url);
    if (cached?.source?.content && cached.analysis) {
      setParserStatus("已命中分析缓存，无需重新解析或调用 AI。", "success");
      const identity = cached.identity || sourceIdentity(cached.source);
      openCase(`history-${identity}`, true);
      return;
    }
    const parsed = await api("/api/parse-link", { url });
    if (parsed.degraded) {
      throw new Error(`只读取到分享页标题，未取得作者、互动数据、评论或视频${parsed.case?.sourceStatus?.browserError ? `：${parsed.case.sourceStatus.browserError}` : ""}`);
    }
    await useImportedSource(parsed.case);
  }
  catch (error) {
    setParserStatus(`${error.message}。你可以使用浏览器扩展导入，或手动粘贴内容继续。`, "error");
    $("#manual-fallback").hidden = false;
  } finally { button.disabled = false; }
});

document.querySelectorAll("[data-fallback]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-fallback]").forEach((item) => item.classList.toggle("active", item === button));
  $("#manual-text-fields").hidden = button.dataset.fallback !== "text";
  $("#manual-media-fields").hidden = button.dataset.fallback !== "media";
}));

$("#manual-case-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if ($("#manual-text-fields").hidden) {
    setParserStatus("文件已在本机选择。当前未配置转写/OCR服务，请切到“手动内容”粘贴正文或逐字稿。", "error");
    return;
  }
  const comments = $("#manual-comments").value.split(/\n+/).map((text) => text.trim()).filter(Boolean).map((text) => ({ text, likeCount: null }));
  const contentType = $("#manual-content-type").value;
  const rawContent = $("#manual-content").value.trim();
  const source = { platform: "xiaohongshu", url: extractFirstUrl($("#post-url").value.trim()), contentType, author: { name: "手动提供", followers: null }, metrics: { likes: Number($("#manual-likes").value) || null, collects: Number($("#manual-collects").value) || null, commentsCount: Number($("#manual-comments-count").value) || null, shares: null }, content: { title: $("#manual-title").value.trim(), text: contentType === "image_text" ? rawContent : "", transcript: contentType === "video" ? rawContent : "" }, comments, videoAnalysis: contentType === "video" ? transcriptRhythm(rawContent) : null, sourceStatus: { fetchedAt: new Date().toISOString(), fieldsAvailable: ["title", contentType === "video" ? "transcript" : "text", ...(comments.length ? ["comments"] : [])] } };
  await useImportedSource(source);
});

$("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  renderFilters();
  renderCases();
});

$("#case-grid").addEventListener("click", (event) => {
  const open = event.target.closest("[data-open]");
  const write = event.target.closest("[data-write]");
  const remove = event.target.closest("[data-delete]");
  if (remove) {
    const identity = remove.dataset.delete;
    if (!window.confirm("删除这条历史案例？删除后需要重新解析链接才能恢复。")) return;
    removeHistory(identity);
    const index = cases.findIndex((entry) => entry.historyIdentity === identity);
    if (index >= 0) cases.splice(index, 1);
    renderFilters(); renderCases();
    return;
  }
  if (open) openCase(open.dataset.open);
  if (write) openCase(write.dataset.write, true);
});

$("#back-button").addEventListener("click", resetLibrary);
$("#retry-analysis-button").addEventListener("click", async () => {
  if (!state.selected?.source) return;
  $("#retry-analysis-button").disabled = true;
  setParserStatus("正在重新进行 AI 爆款分析……", "loading");
  try { await useImportedSource(state.selected.source); }
  finally { $("#retry-analysis-button").disabled = false; }
});
$("#source-evidence").addEventListener("click", async (event) => {
  const button = event.target.closest("#retry-transcript");
  if (!button || !state.selected?.source) return;
  button.disabled = true;
  button.textContent = "正在重新获取逐字稿……";
  setParserStatus("正在重新获取逐字稿，成功后会自动继续分析……", "loading");
  try {
    const started = await api("/api/transcription-jobs", { case: state.selected.source });
    const deadline = Date.now() + 15 * 60 * 1000;
    let result;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await api(`/api/transcription-jobs?id=${encodeURIComponent(started.job.id)}`);
      if (result.job.status === "complete") break;
      if (result.job.status === "failed") { const failure = new Error(result.job.error?.message || "逐字稿获取失败"); failure.code = result.job.error?.code; throw failure; }
    }
    if (result?.job.status !== "complete") { const timeout = new Error("逐字稿处理时间较长，本次等待已停止，可以稍后重新获取"); timeout.code = "ASR_TIMEOUT"; throw timeout; }
    await useImportedSource(result.job.case);
  } catch (error) {
    setParserStatus(error.message, "error");
    button.disabled = false;
    button.textContent = "重新获取逐字稿";
    if (error.code === "VIDEO_SOURCE_UNAVAILABLE" && state.selected.source.url) window.open(state.selected.source.url, "_blank");
  }
});
$("#start-writing").addEventListener("click", () => {
  $("#composer").hidden = false;
  $("#result").hidden = true;
  if (!$("#audience").value && state.persona.targetAudience) $("#audience").value = state.persona.targetAudience;
  renderCreationReference();
  $("#composer").scrollIntoView({ behavior: "smooth", block: "start" });
  state.followUpAsked = false;
  state.contentDirections = [];
  state.directionAnalysis = null;
  state.selectedDirection = null;
  state.confirmedStrategy = null;
  state.evidenceMiningActive = false;
  state.evidenceSufficiency = null;
  state.directionStatus = "EMPTY";
  $("#direction-panel").hidden = true;
  $("#script-form").hidden = false;
  $("#follow-up").hidden = true;
  $("#guided-chat").hidden = true;
  setTimeout(() => $("#creation-reference").scrollIntoView({ behavior: "smooth", block: "start" }), 250);
});

function directionContentDNA(selected) {
  return {
    topic: selected.title || selected.source?.content?.title || "",
    question: selected.viralMechanism?.valuePromise || "",
    mechanisms: selected.viralMechanism || {},
    structure: (selected.contentStructure?.segments || []).slice(0, 6),
    transferable: selected.transferableDNA || {},
    sourceConclusion: selected.preview || selected.source?.content?.text || selected.source?.content?.transcript || "",
  };
}

function renderContentDirections() {
  const analysis = state.directionAnalysis || {};
  const fit = analysis.creatorFit || {};
  const dna = analysis.sourceDNA || {};
  const borrowable = fit.canBorrow?.length ? fit.canBorrow : Array.isArray(dna.mechanisms) ? dna.mechanisms : Object.values(dna.mechanisms || {}).filter(Boolean);
  $("#direction-source-summary").innerHTML = `<strong>这条可以借什么</strong><br>${escapeHtml(borrowable.join("、") || "只借话题和传播机制")}<br><strong>不能直接借什么</strong><br>${escapeHtml((fit.cannotBorrow || []).join("、") || "原作者的身份、经历、结果、案例和数据")}<br><span>Creator Fit：${escapeHtml(fit.level || "有条件适合")} · ${escapeHtml(fit.reason || analysis.recommendation || "需要以你的真实素材重新得出结论")}</span>`;
  $("#direction-cards").innerHTML = state.contentDirections.length ? state.contentDirections.map((direction, index) => `<label class="direction-card" data-direction-id="${escapeHtml(direction.id)}"><input type="checkbox" value="${escapeHtml(direction.id)}"><span><strong>${index + 1}. ${escapeHtml(direction.title)}</strong><span>${escapeHtml(direction.coreIdea)}</span><small>${escapeHtml(direction.whySuitable || direction.relationshipToSource || "")}</small></span></label>`).join("") : `<div class="direction-source-summary"><strong>目前不建议直接生成</strong><br>${escapeHtml(analysis.recommendation || "现有真实素材不足以支持一个可信的新方向。")}<br>${analysis.missingEvidence?.length ? `还缺：${escapeHtml(analysis.missingEvidence.join("、"))}` : ""}</div>`;
  $("#confirm-direction").disabled = !state.contentDirections.length;
  $("#direction-panel").hidden = false;
  $("#direction-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function prepareContentDirections(input) {
  const selected = state.selected || input.referenceContext || {};
  const result = await api("/api/content-directions", {
    contentDNA: directionContentDNA(selected),
    creatorProfile: { identity: state.persona.identity, contentDirection: state.persona.contentDirection, targetAudience: state.persona.targetAudience, personalStory: state.persona.personalStory },
    creatorMemory: [state.persona.voiceDNA, state.persona.voiceSample].filter(Boolean),
    userMaterial: input.currentMaterial,
    followUpAnswer: input.followUpAnswer,
  }, 35000);
  state.directionAnalysis = result;
  state.contentDirections = result.contentDirections || [];
  state.directionStatus = "CONTENT_DIRECTIONS_READY";
  renderContentDirections();
}

$("#direction-cards").addEventListener("change", (event) => {
  const checked = [...document.querySelectorAll("#direction-cards input:checked")];
  if (checked.length > 2) { event.target.checked = false; $("#direction-error").textContent = "最多选择两个相关方向合并。"; }
  else $("#direction-error").textContent = "";
  document.querySelectorAll(".direction-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input")?.checked));
});

$("#custom-direction-button").addEventListener("click", () => { $("#direction-custom").hidden = false; $("#custom-direction").focus(); $("#confirm-direction").disabled = false; });

async function assessEvidenceSufficiency(followUpAnswer = "") {
  const result = await api("/api/evidence-sufficiency", { confirmedDirection: state.selectedDirection, confirmedUserConclusion: state.confirmedStrategy?.confirmedUserConclusion, userMaterial: state.lastInput?.currentMaterial || "", followUpAnswer, requestedDurationSeconds: Number(state.lastInput?.duration || 60), creatorProfile: state.persona }, 30000);
  state.evidenceSufficiency = result.evidenceSufficiency;
  state.confirmedStrategy.evidenceSufficiency = result.evidenceSufficiency;
  return result.evidenceSufficiency;
}

function showEvidenceMining(check) {
  const potential = check.contentPotential || {};
  const questions = check.followUpQuestions?.length ? check.followUpQuestions : ["现在最缺的是一个具体发生过的细节。有没有一个你印象比较深的表现？没有也可以直接说没有。"]; 
  state.evidenceMiningActive = true;
  state.followUpAsked = true;
  state.directionStatus = "EVIDENCE_PARTIAL";
  $("#follow-up-question").textContent = questions.map((question, index) => questions.length > 1 ? `${index + 1}. ${question}` : question).join("\n");
  $("#evidence-duration-note").textContent = `现有真实素材更适合约 ${potential.recommendedDurationSeconds || 30} 秒，最长建议 ${potential.maxSafeDurationSeconds || 35} 秒。继续拉长容易重复或灌水。`;
  $("#evidence-duration-note").hidden = false;
  $("#evidence-skip").hidden = false;
  $("#follow-up").hidden = false;
  $("#script-form").hidden = false;
  $("#follow-up-answer").value = "";
  $("#follow-up-answer").focus();
}

$("#confirm-direction").addEventListener("click", async () => {
  const button = $("#confirm-direction");
  const custom = $("#custom-direction").value.trim();
  const ids = [...document.querySelectorAll("#direction-cards input:checked")].map((input) => input.value);
  if (!custom && !ids.length) { $("#direction-error").textContent = "请选择一个方向，或者用自己的话说这次真正想讲什么。"; return; }
  button.disabled = true;
  button.textContent = "正在锁定内容方向…";
  try {
    let direction;
    if (custom) direction = { id: "custom", type: "DIFFERENT_VIEW", title: custom.slice(0, 28), userConclusion: custom, coreIdea: custom, singleCoreIdea: custom, supportingEvidence: [state.lastInput.currentMaterial, state.lastInput.followUpAnswer].filter(Boolean), userEvidence: [state.lastInput.currentMaterial, state.lastInput.followUpAnswer].filter(Boolean), conclusionIndependence: { status: "PASS", reason: "由用户基于自己的素材亲自确认。" }, framingIndependence: { status: "PASS", reason: "由用户用自己的表达亲自确认。" }, whySuitable: "由用户亲自确认" };
    else if (ids.length === 1) direction = state.contentDirections.find((item) => item.id === ids[0]);
    else {
      const directions = ids.map((id) => state.contentDirections.find((item) => item.id === id)).filter(Boolean);
      const merged = await api("/api/content-directions/merge", { directions, userMaterial: state.lastInput.currentMaterial }, 30000);
      if (!merged.mergeable || !merged.direction) throw new Error(merged.reason || "这两个方向不适合合并，请只选一个");
      direction = merged.direction;
    }
    state.selectedDirection = direction;
    state.directionStatus = "DIRECTION_CONFIRMED";
    state.confirmedStrategy = { confirmedUserConclusion: direction.userConclusion || direction.singleCoreIdea || direction.coreIdea, singleCoreIdea: direction.userConclusion || direction.singleCoreIdea || direction.coreIdea, directionId: direction.id, narrativePath: direction.narrativePath || [], allowedMechanisms: (state.directionAnalysis?.sourceDNA?.mechanisms || []).slice(0, 3), supportingEvidence: direction.supportingEvidence || direction.userEvidence || [], evidence: direction.supportingEvidence || direction.userEvidence || [], conclusionIndependence: direction.conclusionIndependence || { status: "PASS", reason: "由用户亲自确认。" }, framingIndependence: direction.framingIndependence || { status: "PASS", reason: "由用户亲自确认。" }, sourceDistinctiveFraming: state.directionAnalysis?.sourceDNA?.sourceDistinctiveFraming || {}, userApprovedSourceFraming: false, forbiddenSourceAssets: [...(state.directionAnalysis?.creatorFit?.cannotBorrow || []), "REFERENCE_ONLY_DO_NOT_COPY_CONCLUSION", "SOURCE_FRAMING_DO_NOT_REUSE"] };
    state.directionStatus = "STRATEGY_CONFIRMED";
    $("#direction-panel").hidden = true;
    const sufficiency = await assessEvidenceSufficiency(state.lastInput.followUpAnswer || "");
    if (sufficiency.status !== "ENOUGH" && sufficiency.followUpNeeded) showEvidenceMining(sufficiency);
    else {
      const maxSafe = Number(sufficiency.contentPotential?.maxSafeDurationSeconds || state.lastInput.duration);
      state.lastInput.duration = String(Math.min(Number(state.lastInput.duration || 60), maxSafe));
      $("#script-form").hidden = true;
      await runGeneration("new");
    }
  } catch (error) { $("#direction-error").textContent = error.message; }
  finally { button.disabled = false; button.textContent = "确认这个方向并生成"; }
});

$("#script-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentMaterial = $("#current-material").value.trim();
  const isReferenceRebuild = Boolean(state.selected && state.selected.id !== "own-idea" && (state.selected.source?.content?.transcript || state.selected.source?.content?.text || state.selected.preview));
  if (!isReferenceRebuild && currentMaterial.length < 6) {
    $("#form-error").textContent = "再多说一点，至少写 6 个字。";
    $("#current-material").focus();
    return;
  }
  $("#form-error").textContent = "";
  const followUpAnswer = $("#follow-up-answer").value.trim();
  if (state.followUpAsked && !followUpAnswer) {
    $("#form-error").textContent = "先补充刚才这个关键过程，我才能把事情讲清楚。";
    $("#follow-up-answer").focus();
    return;
  }
  const selectedReference = state.selected && state.selected.id !== "own-idea" ? state.selected : null;
  state.lastInput = {
    currentMaterial,
    transcript: state.voiceTranscript ? { ...state.voiceTranscript, normalizedTranscript: currentMaterial } : null,
    audience: $("#audience").value,
    duration: $("#duration").value,
    followUpAnswer,
    referenceContext: selectedReference ? {
      id: selectedReference.id,
      title: selectedReference.title || "",
      preview: selectedReference.preview || "",
      source: selectedReference.source || null,
      structure: selectedReference.structure || [],
      contentStructure: selectedReference.contentStructure || null,
      viralMechanism: selectedReference.viralMechanism || {},
      transferableDNA: selectedReference.transferableDNA || null,
      learn: selectedReference.learn || [],
      avoid: selectedReference.avoid || "",
    } : null,
  };
  if (state.voiceTranscript && currentMaterial) {
    state.persona.voiceSample = [state.persona.voiceSample || "", currentMaterial].filter(Boolean).join("\n").slice(-6000);
    localStorage.setItem("koubo-persona", JSON.stringify(state.persona));
    syncProfileToCloud().catch((error) => console.warn("Creator DNA 云同步失败", error));
  }
  if (state.evidenceMiningActive && state.selectedDirection && state.confirmedStrategy) {
    const sufficiency = await assessEvidenceSufficiency(followUpAnswer);
    const maxSafe = Number(sufficiency.contentPotential?.maxSafeDurationSeconds || sufficiency.contentPotential?.recommendedDurationSeconds || state.lastInput.duration);
    state.lastInput.duration = String(Math.min(Number(state.lastInput.duration || 60), maxSafe));
    state.evidenceMiningActive = false;
    state.followUpAsked = false;
    state.directionStatus = "STRATEGY_CONFIRMED";
    $("#evidence-skip").hidden = true;
    $("#evidence-duration-note").hidden = true;
    await runGeneration("new");
    return;
  }
  if (!state.followUpAsked && !isReferenceRebuild) {
    const selected = state.selected || { contentStructure: { segments: [] }, structure: [], viralMechanism: {}, transferableDNA: {} };
    let verdict = { sufficient: currentMaterial.length >= 28 && /曾经|最近|后来|因为|发现|发生|当时|第一次/.test(currentMaterial), question: "能补充一件和你这次内容直接相关的具体事情吗？" };
    if (state.aiConfigured) {
      try { verdict = await api("/api/completeness", { contentStructure: selected.contentStructure || selected.structure || [], viralMechanism: selected.viralMechanism || {}, transferableDNA: selected.transferableDNA || {}, identityDNA: state.persona, currentMaterial }); }
      catch (error) { $("#form-error").textContent = `完整度判断失败，已使用基础判断：${error.message}`; }
    }
    if (!verdict.sufficient) {
      state.followUpAsked = true;
      $("#follow-up-question").textContent = verdict.question || "能补充一个真实发生过的细节吗？";
      $("#follow-up").hidden = false;
      $("#follow-up-answer").focus();
      return;
    }
  }
  if (isReferenceRebuild && state.directionStatus !== "STRATEGY_CONFIRMED") {
    const button = $(".generate-button");
    button.disabled = true;
    button.classList.add("is-loading");
    $(".generate-button .button-label").textContent = "正在生成内容方向";
    try { await prepareContentDirections(state.lastInput); }
    catch (error) { $("#form-error").textContent = `内容方向生成失败：${error.message}`; }
    finally { button.disabled = false; button.classList.remove("is-loading"); $(".generate-button .button-label").textContent = "生成我的口播稿"; }
    return;
  }
  await runGeneration("new");
});

$("#evidence-skip").addEventListener("click", async () => {
  if (!state.evidenceMiningActive || !state.lastInput) return;
  const recommended = Number(state.evidenceSufficiency?.contentPotential?.recommendedDurationSeconds || 30);
  state.lastInput.duration = String(recommended);
  $("#duration").value = ["30", "60", "90"].includes(String(recommended)) ? String(recommended) : "30";
  state.evidenceMiningActive = false;
  state.followUpAsked = false;
  state.directionStatus = "STRATEGY_CONFIRMED";
  $("#follow-up").hidden = true;
  $("#script-form").hidden = true;
  await runGeneration("new");
});

$("#regenerate-button").addEventListener("click", () => {
  document.querySelectorAll("[data-regenerate-reason]").forEach((item) => item.classList.remove("selected"));
  $("#regenerate-note").value = "";
  $("#regenerate-dialog").showModal();
});
$("#restore-previous-button").addEventListener("click", async () => {
  const previous = cloneVersion(state.previousVersion);
  if (!previous) return;
  state.previousVersion = null;
  state.lastScript = previous.lastScript;
  state.scriptVariants = previous.scriptVariants || { full: previous.lastScript, spoken: previous.lastScript, outline: null };
  state.activeCandidate = previous.activeCandidate || "A";
  const restoredScript = state.scriptVariants.spoken || state.scriptVariants.full || state.lastScript;
  await renderResult(restoredScript, state.lastInput, state.generationStatus || "success");
  saveProject("draft");
  renderPreviousVersionAction();
  recordEvent("restore_previous_version");
  $("#copy-status").textContent = "已恢复重新生成前的上一版。";
});
document.querySelectorAll("[data-regenerate-reason]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("selected")));
function inferAdjustmentScope(reasons, note) {
  const text = `${reasons.join("、")} ${note}`;
  if (/(?:只|仅).{0,4}(?:改|调整).{0,4}(?:开头|hook)|(?:开头|hook).{0,4}(?:其他|正文).{0,4}(?:不动|保留)/i.test(text) || (reasons.length === 1 && reasons[0] === "开头更抓人" && !note.trim())) return "hook";
  if (/(?:只|仅).{0,4}(?:改|调整).{0,4}(?:结尾|收尾)|(?:结尾|收尾).{0,4}(?:其他|正文).{0,4}(?:不动|保留)/.test(text)) return "ending";
  if (/互动感|增加互动|镜头交流|交流感|对话感|让观众参与|观众参与/.test(text)) return "engagement";
  return "full";
}
$("#apply-regenerate").addEventListener("click", (event) => {
  event.preventDefault();
  const reasons = [...document.querySelectorAll("[data-regenerate-reason].selected")].map((item) => item.dataset.regenerateReason);
  const note = $("#regenerate-note").value.trim();
  state.adjustmentScope = inferAdjustmentScope(reasons, note);
  const defaultRevision = "检查并修复开头衔接：Hook是完整稿真正说出的第一句，正文第一段必须直接承接并推进新信息，不能复述、同义改写或重新开场；其他已经有效的内容尽量逐字保留";
  state.adjustment = `基于当前稿迭代。请先理解反馈属于表达、结构、证据还是内容方向，再决定修改当前稿或回退上游；本次反馈：${reasons.join("、") || defaultRevision}。补充：${note || "无"}`;
  rememberCandidateLearning({ kind: "regenerate_preference", reasons, instruction: note || reasons.join("、") });
  $("#regenerate-dialog").close();
  runGeneration("refine");
});
$("#timeout-retry").addEventListener("click", () => { $("#timeout-result").hidden = true; runGeneration("new"); });
$("#show-structure-draft").addEventListener("click", () => {
  const draft = state.structureDraft;
  if (!draft) return;
  $("#structure-draft").hidden = false;
  $("#structure-draft").innerHTML = `<h4>结构草稿</h4>${draft.sections.map((section) => `<div class="script-section"><div class="script-label">${escapeHtml(section.label)}</div><p>${escapeHtml(section.text)}</p></div>`).join("")}<p class="data-note">当前为结构草稿，可重新尝试生成完整口播稿。</p>`;
});
document.querySelectorAll("[data-script-mode]").forEach((button) => button.addEventListener("click", () => renderScriptMode(button.dataset.scriptMode)));
document.querySelectorAll("[data-candidate]").forEach((button) => button.addEventListener("click", async () => {
  const candidate = state.abCandidates.find((item) => item.label === button.dataset.candidate);
  if (!candidate) return;
  state.activeCandidate = candidate.label;
  state.lastScript = candidate.script;
  state.scriptVariants = { full: candidate.script, spoken: candidate.script, outline: null };
  document.querySelectorAll("[data-candidate]").forEach((item) => item.classList.toggle("active", item === button));
  await renderScriptMode("natural");
  $("#result-title").textContent = candidate.script.titles?.[0] || candidate.script.title || "自然口语版";
}));
$("#choose-candidate").addEventListener("click", () => {
  const candidate = state.abCandidates.find((item) => item.label === state.activeCandidate);
  if (!candidate) return;
  recordEvent("blind_test_choice", { candidate: state.activeCandidate, provider: candidate.provider });
  $("#copy-status").textContent = `已记录：${state.activeCandidate} 稿更好。`;
  saveProject("draft");
});
$("#retry-formal").addEventListener("click", () => { $("#result").hidden = true; $("#composer").hidden = false; runGeneration("retry"); });

$("#script-body").addEventListener("mouseup", (event) => {
  const paragraph = event.target.closest(".script-section p");
  if (!paragraph) return;
  const selection = window.getSelection();
  const selectedText = selection && paragraph.contains(selection.anchorNode) ? selection.toString().trim() : "";
  state.selectedSection = { kind: "section", paragraph, selectedText: selectedText || paragraph.textContent, viewMode: state.viewMode };
});

$("#hook-card").addEventListener("mouseup", () => {
  const paragraph = $("#result-hook");
  const selection = window.getSelection();
  const selectedText = selection && paragraph.contains(selection.anchorNode) ? selection.toString().trim() : "";
  state.selectedSection = { kind: "hook", paragraph, selectedText: selectedText || paragraph.textContent, viewMode: state.viewMode };
});

$("#local-rewrite-button").addEventListener("click", () => {
  const currentParagraph = state.selectedSection?.paragraph;
  if (currentParagraph?.isConnected) {
    const currentText = currentParagraph.textContent || "";
    if (!state.selectedSection.selectedText || !currentText.includes(state.selectedSection.selectedText)) {
      state.selectedSection.selectedText = currentText;
    }
    state.selectedSection.viewMode = state.viewMode;
  }
  if (!state.selectedSection?.paragraph?.isConnected) {
    $("#copy-status").textContent = "请先选中 Hook、某句话或某一段，再点“这段不对劲”。";
    return;
  } else {
    $("#rewrite-error").textContent = "";
  }
  $("#selected-preview").textContent = state.selectedSection.selectedText;
  document.querySelectorAll("[data-local-reason]").forEach((item) => item.classList.remove("selected"));
  $("#manual-replacement").value = "";
  $("#rewrite-dialog").showModal();
});

document.querySelectorAll("[data-local-reason]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-local-reason]").forEach((item) => item.classList.toggle("selected", item === button));
  const prompts = {
    not_speakable: "例如：前半句太绕，先说结果，再补原因",
    meaning_wrong: "请直接说明你真正想表达的意思",
    too_long: "例如：保留核心观点，压缩成两句话",
    not_me: "例如：我不会这样教育别人，我会直接说自己的经历",
    manual: "在这里输入你要直接替换成的新内容",
  };
  $("#manual-replacement").placeholder = prompts[button.dataset.localReason];
  $("#manual-replacement").focus();
}));

$("#apply-local-rewrite").addEventListener("click", async (event) => {
  event.preventDefault();
  const submitButton = event.currentTarget;
  const reason = document.querySelector("[data-local-reason].selected")?.dataset.localReason;
  const userInstruction = $("#manual-replacement").value.trim();
  if (!reason && !userInstruction) { $("#rewrite-error").textContent = "请选择一个原因，或者直接说说你希望怎么改。"; return; }
  const target = state.selectedSection;
  const paragraph = target?.paragraph;
  if (!paragraph?.isConnected) { $("#rewrite-error").textContent = "原文已经变化，请关闭后重新选择要修改的内容。"; return; }
  const currentText = paragraph.textContent || "";
  const original = currentText.includes(target.selectedText) ? target.selectedText : currentText;
  if (!original.trim()) { $("#rewrite-error").textContent = "请先选择要修改的文字。"; return; }
  try {
    submitButton.disabled = true;
    submitButton.textContent = "正在修改…";
    $("#rewrite-error").textContent = "";
    let replacement = userInstruction;
    if (reason !== "manual") {
      const paragraphs = [$("#result-hook"), ...document.querySelectorAll("#script-body .script-section p")].filter(Boolean);
      const paragraphIndex = paragraphs.indexOf(paragraph);
      const context = { previous: paragraphIndex > 0 ? paragraphs[paragraphIndex - 1].textContent : "", current: paragraph.textContent, next: paragraphIndex >= 0 && paragraphIndex < paragraphs.length - 1 ? paragraphs[paragraphIndex + 1].textContent : "", strategy: state.confirmedStrategy || null };
      const creatorPreference = { speakingStyle: state.persona.speakingStyle, forbiddenExpressions: state.persona.forbiddenExpressions, voiceDNA: state.persona.voiceDNA || null };
      replacement = (await api("/api/rewrite-selection", { selectedText: original, reason: reason || "custom", userInstruction, context, creatorDNA: creatorPreference })).replacementText;
    }
    if (!replacement) { $("#rewrite-error").textContent = "请填写修改后的内容。"; return; }
    paragraph.textContent = paragraph.textContent.replace(original, replacement);
    const variantKey = target.viewMode === "natural" ? "spoken" : target.viewMode;
    const activeScript = variantKey === "full" ? (state.scriptVariants.full || state.lastScript) : (state.scriptVariants[variantKey] || state.lastScript);
    if (target.kind === "hook") activeScript.hook = String(activeScript.hook || "").replace(original, replacement);
    else activeScript.sections = (activeScript.sections || []).map((section) => ({ ...section, text: String(section.text).replace(original, replacement) }));
    if (variantKey === "full") { state.lastScript = activeScript; state.scriptVariants.full = activeScript; }
    else state.scriptVariants[variantKey] = activeScript;
    $("#rewrite-dialog").close();
    recordEvent("rewrite_selection_used", { reason });
    saveProject("draft");
    rememberCandidateLearning({ kind: "local_rewrite", reason: reason || "manual", reasons: [reason || "manual"], instruction: userInstruction || "", before: original, after: replacement });
    window.getSelection()?.removeAllRanges();
    state.selectedSection = null;
    const editedMode = target.viewMode === "outline" ? "提纲开口版" : "自然口语版";
    $("#copy-status").textContent = `已修改“${editedMode}”中的选中内容，其他版本保持不变。`;
  } catch (error) { $("#rewrite-error").textContent = error.message; }
  finally {
    submitButton.disabled = false;
    submitButton.textContent = "只修改这句话";
  }
});

$("#ready-button").addEventListener("click", () => {
  syncCurrentScript();
  saveProject("ready_to_shoot");
  const learned = acceptCurrentProjectLearning();
  recordEvent("ready_to_shoot");
  updateShootPlan();
  renderShootPlan(true);
  $("#copy-status").textContent = `已加入待拍；下面已经生成 3 个后续任务。${learned ? `同时记住了这篇的 ${learned} 条有效修改。` : ""}`;
  $("#shoot-plan").scrollIntoView({ behavior: "smooth", block: "center" });
});

$("#shoot-date").addEventListener("change", (event) => { updateShootPlan({ scheduledAt: event.target.value }); renderShootPlan(true); });
$("#shoot-tasks").addEventListener("click", (event) => {
  const button = event.target.closest("[data-shoot-task]");
  if (!button) return;
  const key = button.dataset.shootTask;
  const project = readCurrentProject();
  const current = Boolean(project?.shootPlan?.[key]);
  const changes = { [key]: !current };
  if (key === "filmed" && !current) changes.prepared = true;
  if (key === "published" && !current) { changes.prepared = true; changes.filmed = true; }
  if (key === "prepared" && current) { changes.filmed = false; changes.published = false; }
  if (key === "filmed" && current) changes.published = false;
  updateShootPlan(changes);
  recordEvent(`shoot_task_${key}`, { completed: !current });
  renderShootPlan(true);
});

$("#open-studio").addEventListener("click", () => {
  $("#recording-studio").hidden = false;
  if (!prompterDraftLines.length) {
    const savedText = readCurrentProject()?.shootPlan?.prompterText || "";
    prompterDraftLines = savedText ? splitPrompterText(savedText) : currentFinalScriptLines();
  }
  renderPrompter(0);
  $("#recording-studio").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#import-current-script").addEventListener("click", () => {
  prompterDraftLines = currentFinalScriptLines();
  prompterIndex = 0;
  renderPrompter(0);
  updateShootPlan({ prompterText: prompterDraftLines.join("\n") });
  $("#follow-status").textContent = `已原样导入当前稿 · ${prompterDraftLines.length} 句`;
});
$("#teleprompter-script").addEventListener("input", () => { syncPrompterEdits(); $("#follow-status").textContent = "已使用你编辑后的提词稿"; });
$("#teleprompter-script").addEventListener("focusout", () => { syncPrompterEdits(); updateShootPlan({ prompterText: prompterDraftLines.join("\n") }); });
$("#teleprompter-script").addEventListener("focusin", (event) => {
  const paragraph = event.target.closest("p");
  if (paragraph?.classList.contains("prompter-empty")) { paragraph.textContent = ""; paragraph.classList.remove("prompter-empty"); }
  const index = Number(paragraph?.dataset.prompterLine);
  if (Number.isInteger(index)) { prompterIndex = index; $("#teleprompter-script").querySelectorAll("p").forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index)); }
});
$("#close-studio").addEventListener("click", () => { if (mediaRecorder?.state === "recording") return; releaseCamera(); $("#recording-studio").hidden = true; });
$("#enable-camera").addEventListener("click", async () => {
  try {
    if (cameraStream) { releaseCamera(); return; }
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: { echoCancellation: true, noiseSuppression: true } });
    $("#camera-preview").srcObject = cameraStream;
    $("#camera-placeholder").hidden = true;
    $("#recording-preview").hidden = true;
    $("#camera-preview").hidden = false;
    $("#enable-camera").textContent = "关闭摄像头";
    $("#start-recording").disabled = false;
    $("#studio-status").textContent = "摄像头已就绪。开始后，提词器会尝试跟随你的语音。";
  } catch (error) { $("#studio-status").textContent = error.name === "NotAllowedError" ? "没有获得摄像头或麦克风权限，请允许后重试。" : `摄像头无法启动：${error.message}`; }
});
$("#start-recording").addEventListener("click", () => {
  if (!cameraStream || typeof MediaRecorder === "undefined") { $("#studio-status").textContent = "当前浏览器不支持内部录像，请使用最新版 Chrome。"; return; }
  recordingChunks = [];
  const mimeType = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
  mediaRecorder = new MediaRecorder(cameraStream, mimeType ? { mimeType } : undefined);
  mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.push(event.data); };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || "video/webm" });
    const title = (state.lastScript?.titles?.[0] || state.lastScript?.title || "口播录像").replace(/[\\/:*?\"<>|]/g, "-");
    $("#studio-status").textContent = blob.type.startsWith("video/mp4") ? "拍摄完成，正在准备 MP4……" : "拍摄完成，正在转换为 MP4……";
    try {
      let mp4Blob = blob;
      if (!blob.type.startsWith("video/mp4")) {
        const response = await fetch(`/api/recordings/convert?name=${encodeURIComponent(title)}`, { method: "POST", headers: { "Content-Type": blob.type || "video/webm" }, body: blob });
        if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || "MP4 转换失败"); }
        mp4Blob = await response.blob();
      }
      recordingMp4Blob = mp4Blob;
      recordingAssetId = "";
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      recordingUrl = URL.createObjectURL(mp4Blob);
      $("#recording-preview").src = recordingUrl;
      $("#recording-preview").hidden = false;
      $("#camera-preview").hidden = true;
      $("#export-recording").href = recordingUrl;
      $("#export-recording").download = `${title}.mp4`;
      $("#export-recording").textContent = "导出 MP4";
      $("#export-recording").hidden = false;
      $("#retake-recording").hidden = false;
      $("#new-recording").hidden = false;
      $("#studio-status").textContent = "拍摄完成，可以预览或导出 MP4。";
      $("#quick-editor").hidden = false;
      $("#recording-edit-status").textContent = "可以裁剪并套用模板";
      $("#edited-preview").hidden = true;
      updateShootPlan({ prepared: true, filmed: true });
      renderShootPlan(true);
    } catch (error) {
      $("#studio-status").textContent = `MP4 导出失败：${error.message}。请重新拍摄后再试。`;
      $("#retake-recording").hidden = false;
      $("#new-recording").hidden = false;
    }
  };
  mediaRecorder.start(1000);
  recordingStartedAt = Date.now();
  $("#recording-badge").hidden = false;
  $("#start-recording").hidden = true;
  $("#stop-recording").hidden = false;
  $("#enable-camera").disabled = true;
  $("#export-recording").hidden = true;
  $("#retake-recording").hidden = true;
  $("#new-recording").hidden = true;
  recordingTimer = setInterval(() => { $("#recording-time").textContent = clock((Date.now() - recordingStartedAt) / 1000); }, 500);
  startSpeechFollower();
});
$("#stop-recording").addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  stopSpeechFollower();
  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = null;
  $("#recording-badge").hidden = true;
  $("#start-recording").hidden = true;
  $("#stop-recording").hidden = true;
  $("#enable-camera").disabled = false;
  $("#follow-status").textContent = "拍摄结束";
});
$("#retake-recording").addEventListener("click", () => { recordEvent("recording_retake"); prepareAnotherRecording({ discardCurrent: true }); });
$("#new-recording").addEventListener("click", () => { recordEvent("recording_new_take"); prepareAnotherRecording({ discardCurrent: false }); });
$("#prompter-prev").addEventListener("click", () => renderPrompter(prompterIndex - 1));
$("#prompter-next").addEventListener("click", () => renderPrompter(prompterIndex + 1));
$("#prompter-size").addEventListener("input", (event) => { $("#teleprompter-script").style.fontSize = `${event.target.value}px`; });

$("#recording-preview").addEventListener("loadedmetadata", () => {
  recordingDuration = Number($("#recording-preview").duration || 0);
  $("#edit-trim-end").value = recordingDuration.toFixed(1);
  $("#edit-trim-end").max = recordingDuration.toFixed(1);
  $("#edit-trim-start").max = Math.max(0, recordingDuration - 0.2).toFixed(1);
  $("#edit-duration-label").textContent = clock(recordingDuration);
  $("#edit-intro-title").value = (state.lastScript?.titles?.[0] || state.lastScript?.title || "").slice(0, 80);
});
$("#edit-template-options").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-template]");
  if (!button) return;
  recordingEditTemplate = button.dataset.editTemplate;
  $("#edit-template-options").querySelectorAll("button").forEach((item) => item.classList.toggle("selected", item === button));
});
$("#edit-volume").addEventListener("input", (event) => { $("#edit-volume-label").textContent = `${event.target.value}%`; });

async function pollRecordingEdit(jobId) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const data = await api(`/api/recording-edit-jobs?id=${encodeURIComponent(jobId)}`);
    $("#recording-edit-status").textContent = data.job.label || "正在剪辑";
    if (data.job.status === "failed") throw new Error(data.job.error || "剪辑失败");
    if (data.job.status === "complete") return data.job;
  }
}

$("#render-recording-edit").addEventListener("click", async () => {
  if (!recordingMp4Blob) { $("#recording-edit-status").textContent = "请先完成一次拍摄"; return; }
  const start = Math.max(0, Number($("#edit-trim-start").value || 0));
  const end = Math.min(recordingDuration, Number($("#edit-trim-end").value || recordingDuration));
  if (!(end > start + 0.1)) { $("#recording-edit-status").textContent = "结束时间需要晚于开始时间"; return; }
  const button = $("#render-recording-edit");
  button.disabled = true;
  $("#edited-preview").hidden = true;
  try {
    if (!recordingAssetId) {
      $("#recording-edit-status").textContent = "正在上传原片";
      const authorization = authState.session?.access_token ? { Authorization: `Bearer ${authState.session.access_token}` } : {};
      const response = await fetch("/api/recording-assets", { method: "POST", headers: { "Content-Type": "video/mp4", ...authorization }, body: recordingMp4Blob });
      const uploaded = await response.json();
      if (!response.ok) throw new Error(uploaded.error || "原片上传失败");
      recordingAssetId = uploaded.asset.id;
    }
    $("#recording-edit-status").textContent = "正在创建剪辑任务";
    const created = await api("/api/recording-edit-jobs", { assetId: recordingAssetId, trimStart: start, trimEnd: end, volume: Number($("#edit-volume").value) / 100, template: recordingEditTemplate, captionText: prompterDraftLines.join("\n") || currentFinalScriptLines().join("\n"), highlightKeywords: $("#edit-highlight").checked, introTitle: $("#edit-intro-title").value.trim(), outroText: $("#edit-outro-text").value.trim() });
    const job = await pollRecordingEdit(created.job.id);
    $("#edited-recording-preview").src = job.videoUrl;
    $("#download-edited-recording").href = job.videoUrl;
    $("#download-edited-recording").download = `口播剪辑版-${recordingEditTemplate}.mp4`;
    $("#edited-preview").hidden = false;
    $("#recording-edit-status").textContent = `剪辑完成 · ${Math.round(job.duration || 0)} 秒 · 1080 × 1920`;
    recordEvent("recording_edit_complete", { template: recordingEditTemplate, duration: job.duration });
  } catch (error) {
    $("#recording-edit-status").textContent = `剪辑失败：${error.message}`;
  } finally { button.disabled = false; }
});

$("#save-story").addEventListener("click", () => {
  saveCollection("koubo-content-assets", { type: "story", content: state.lastInput.currentMaterial, sourceProjectId: state.currentProjectId, createdAt: new Date().toISOString() });
  $("#asset-save-prompt").hidden = true;
  $("#copy-status").textContent = "真实经历已保存到内容资产。";
});
$("#skip-story").addEventListener("click", () => { $("#asset-save-prompt").hidden = true; });

document.querySelectorAll("[data-reason]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("selected")));
$("#apply-personalize").addEventListener("click", (event) => {
  event.preventDefault();
  const reasons = [...document.querySelectorAll("[data-reason].selected")].map((item) => item.dataset.reason);
  state.adjustment = `更像用户本人。问题：${reasons.join("、") || "不像我说话"}。补充：${$("#personalize-note").value.trim() || "无"}`;
  $("#personalize-dialog").close();
  runGeneration("personal");
});

$("#title-candidates").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const current = $("#result-title").textContent;
  $("#result-title").textContent = button.textContent.replace(/^备选：/, "");
  button.textContent = `备选：${current}`;
});

function recordFeedback(type, value, container) {
  container.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.textContent === String(value) || button.dataset.score === String(value)));
  const feedback = { generationId: Date.now(), caseId: state.selected?.id, [type]: value, createdAt: new Date().toISOString() };
  saveCollection("koubo-feedback", feedback);
  $("#feedback-status").textContent = "已记录，只用于判断这篇稿子是否真的有用。";
}
$("#shootability").addEventListener("click", (event) => { if (event.target.tagName === "BUTTON") recordFeedback("shootability", event.target.textContent, $("#shootability")); });
$("#persona-score").addEventListener("click", (event) => { if (event.target.dataset.score) recordFeedback("personaMatchScore", Number(event.target.dataset.score), $("#persona-score")); });
$("#copy-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(fullScriptText());
    $("#copy-status").textContent = "已复制，可以直接去拍了。";
    $("#copy-button").textContent = "已复制";
    setTimeout(() => { $("#copy-button").textContent = "复制全文"; }, 1600);
  } catch {
    $("#copy-status").textContent = "浏览器未允许复制，请选中文稿后手动复制。";
  }
});

$("#start-reference").addEventListener("click", () => { state.flowMode = "reference"; recordEvent("choose_reference_mode"); $("#library").scrollIntoView({ behavior: "smooth" }); });
$("#start-idea").addEventListener("click", startIdeaFlow);
$("#show-all-projects").addEventListener("click", () => renderProjects(true));
function openSavedProject(event) {
  const button = event.target.closest("[data-project-id]");
  if (!button) return;
  const project = readProjects().find((item) => item.id === button.dataset.projectId);
  if (!project) return;
  state.currentProjectId = project.id;
  state.previousVersion = project.previous_version || null;
  prompterDraftLines = [];
  prompterIndex = 0;
  state.flowMode = project.source === "自己的想法" ? "idea" : "reference";
  state.lastInput = project.input;
  state.scriptVariants = project.scriptVariants || { full: project.script, spoken: null, outline: null };
  state.abCandidates = project.abCandidates || [];
  state.activeCandidate = project.activeCandidate || "A";
  state.lastScript = state.scriptVariants.full || project.script;
  state.generationStatus = project.generationStatus || "success";
  state.contentDirections = project.content_directions || [];
  state.selectedDirection = project.selected_direction || null;
  state.confirmedStrategy = project.confirmed_strategy || null;
  state.directionStatus = project.direction_status || (state.selectedDirection ? "GENERATED" : "EMPTY");
  state.revisionMemory = project.revision_memory || { acceptedPatterns: [], rejectedPatterns: [], resolvedProblems: [], remainingProblems: [], userFeedback: [] };
  $(".hero").hidden = true; $("#library").hidden = true; $("#workspace").hidden = false; $(".case-detail").hidden = true; $("#composer").hidden = true;
  renderResult(state.lastScript, project.input, state.generationStatus);
  saveProject(project.status);
  renderShootPlan(project.status !== "draft");
}
$("#project-list").addEventListener("click", openSavedProject);
$("#my-project-list").addEventListener("click", openSavedProject);
$("#my-reference-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-reference-id]");
  if (button) openCase(`history-${button.dataset.referenceId}`);
});

function openPersona(scroll = true) {
  const persona = state.persona;
  $("#identity").value = persona.identity;
  $("#content-direction").value = persona.contentDirection;
  $("#persona-audience").value = persona.targetAudience;
  $("#personal-story").value = persona.personalStory;
  $("#speaking-style").value = persona.speakingStyle;
  $("#preferred-platform").value = persona.preferredPlatform || "通用短视频";
  $("#content-goal").value = persona.contentGoal || "建立信任";
  $("#title-style").value = persona.titleStyle || "真实克制";
  $("#cta-preference").value = persona.ctaPreference || "不主动号召";
  $("#forbidden-expressions").value = persona.forbiddenExpressions || "";
  $("#voice-sample").value = persona.voiceSample || "";
  $("#persona-panel").hidden = false;
  if (scroll) $("#persona-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#persona-entry")?.addEventListener("click", () => showModule("mine"));
document.querySelectorAll("[data-module]").forEach((button) => button.addEventListener("click", () => showModule(button.dataset.module)));
$("#persona-close").addEventListener("click", () => { $("#persona-panel").hidden = true; });
$("#persona-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const voiceSample = $("#voice-sample").value.trim();
  let voiceDNA = state.persona.voiceDNA || null;
  if (voiceSample && state.aiConfigured) {
    $("#voice-status").textContent = "正在学习表达特征……";
    try { voiceDNA = (await api("/api/voice-dna", { sample: voiceSample })).voiceDNA; }
    catch (error) { $("#voice-status").textContent = `表达特征提取失败：${error.message}`; return; }
  }
  state.persona = {
    userId: "local-user",
    identity: $("#identity").value.trim(),
    contentDirection: $("#content-direction").value.trim(),
    targetAudience: $("#persona-audience").value.trim(),
    personalStory: $("#personal-story").value.trim(),
    speakingStyle: $("#speaking-style").value,
    preferredPlatform: $("#preferred-platform").value,
    contentGoal: $("#content-goal").value,
    titleStyle: $("#title-style").value,
    ctaPreference: $("#cta-preference").value,
    forbiddenExpressions: $("#forbidden-expressions").value.trim(),
    voiceSample, voiceDNA,
  };
  localStorage.setItem("koubo-persona", JSON.stringify(state.persona));
  localStorage.setItem("koubo-personas", JSON.stringify([state.persona]));
  syncProfileToCloud().catch((error) => console.warn("Creator DNA 云同步失败", error));
  renderPersonaEntry();
  renderCreationReference();
  $("#persona-panel").hidden = true;
  $("[data-module='mine']")?.focus();
});

$("#auth-entry").addEventListener("click", showAuthDialog);
$("#create-extension-token").addEventListener("click", async () => {
  $("#extension-token-error").textContent = "";
  $("#create-extension-token").disabled = true;
  try {
    const result = await api("/api/extension-token", { name: navigator.userAgent.includes("Edg/") ? "Edge 浏览器" : "Chrome 浏览器" });
    if (!result.token?.token) throw new Error("连接码创建失败，请确认安全函数迁移已执行");
    $("#extension-token-value").textContent = result.token.token;
    $("#extension-token-result").hidden = false;
  } catch (error) { $("#extension-token-error").textContent = error.message; }
  finally { $("#create-extension-token").disabled = false; }
});
$("#copy-extension-token").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#extension-token-value").textContent);
  $("#copy-extension-token").textContent = "已复制";
  setTimeout(() => { $("#copy-extension-token").textContent = "复制连接码"; }, 1500);
});
$("#auth-mode").addEventListener("click", () => {
  authState.mode = authState.mode === "signin" ? "signup" : "signin";
  $("#auth-title").textContent = authState.mode === "signup" ? "创建账号" : "登录后继续创作";
  $("#auth-submit").textContent = authState.mode === "signup" ? "注册" : "登录";
  $("#auth-mode").textContent = authState.mode === "signup" ? "已有账号？登录" : "还没有账号？注册";
  $("#auth-error").textContent = "";
});
$("#auth-signout").addEventListener("click", async () => {
  try {
    if (authState.session?.access_token) await supabaseAuth("logout", { method: "POST", headers: { Authorization: `Bearer ${authState.session.access_token}` } });
  } catch {}
  saveAuthSession(null);
  $("#auth-dialog").close();
  showAuthDialog();
});
$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#auth-error").textContent = "";
  $("#auth-submit").disabled = true;
  try {
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const path = authState.mode === "signup" ? "signup" : "token?grant_type=password";
    const result = await supabaseAuth(path, { method: "POST", body: JSON.stringify({ email, password }) });
    if (!result.access_token) {
      $("#auth-error").textContent = "注册成功，请先打开邮箱完成验证，再回来登录。";
      authState.mode = "signin";
      $("#auth-submit").textContent = "登录";
      $("#auth-mode").textContent = "还没有账号？注册";
      return;
    }
    saveAuthSession(result);
    await loadCloudUserData();
    if (new URLSearchParams(location.search).get("import")) return location.reload();
    $("#auth-dialog").close();
  } catch (error) { $("#auth-error").textContent = error.message; }
  finally { $("#auth-submit").disabled = false; }
});

async function initializeAuth() {
  try {
    const config = await fetch("/api/public-config").then((response) => response.json());
    authState.config = config.supabase;
    if (!authState.config) { $("#auth-entry").textContent = "登录未配置"; return; }
    $("#auth-entry").disabled = false;
    let session = readAuthSession();
    if (session?.expires_at && Number(session.expires_at) * 1000 < Date.now() + 30_000) session = await refreshAuthSession(session);
    if (session?.access_token) {
      saveAuthSession(session);
      try { await api("/api/auth/me"); await loadCloudUserData(); }
      catch { session = null; saveAuthSession(null); }
    }
    if (!session) showAuthDialog();
  } catch (error) { console.warn("Supabase 登录初始化失败", error); }
}

loadHistoryCases();
renderFilters();
renderCases();
renderPersonaEntry();
renderProjects();
initializeAuth().then(() => api("/api/health")).then(async (data) => {
  state.aiConfigured = data.aiConfigured;
  state.doubaoConfigured = data.doubaoConfigured;
  const importId = new URLSearchParams(location.search).get("import");
  if (!importId) return;
  setParserStatus("已收到浏览器扩展内容，正在准备拆解……", "loading");
  try {
    const imported = await api(`/api/browser-import?id=${encodeURIComponent(importId)}`);
    history.replaceState({}, "", location.pathname);
    let source = imported.case;
    try { source = await waitForLongVideoTranscript(source); }
    catch (transcriptionError) {
      source.sourceStatus = { ...(source.sourceStatus || {}), transcription: transcriptionError.code === "ASR_TIMEOUT" ? "processing" : "failed", transcriptionError: transcriptionError.message };
      await useImportedSource(source);
      setParserStatus(`${transcriptionError.message}。帖子内容已经保留，可以稍后重新获取逐字稿。`, "error");
      return;
    }
    await useImportedSource(source);
  } catch (error) { setParserStatus(error.message, "error"); }
}).catch(() => { state.aiConfigured = false; });
