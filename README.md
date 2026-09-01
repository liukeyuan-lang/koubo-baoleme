# 口播爆了么

本地运行的口播案例分析与脚本生成工具。用户口述默认使用本地 FunASR（Paraformer + VAD + 标点）转写，不需要云端 ASR Key。

## 环境要求

- Node.js 22.12 或更高版本
- Python 3.9 或更高版本（仅旧采集脚本需要）
- ffmpeg/ffprobe 由 npm 依赖提供

## 首次安装

```bash
npm install
python -m venv .venv
```

Windows：

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

macOS / Linux：

```bash
.venv/bin/python -m pip install -r requirements.txt
```

首次语音识别会自动下载 Paraformer、FSMN-VAD 和轻量 CT-Punc-C 模型，耗时取决于网络；之后可离线使用。默认使用 CPU，可通过 `LOCAL_ASR_DEVICE` 调整。

复制 `.env.example` 为 `.env`，填写密钥，并按系统设置 Python：

```text
# Windows
PYTHON_BIN=.venv\Scripts\python.exe

# macOS / Linux
PYTHON_BIN=.venv/bin/python
```

启动与检查：

```bash
npm run check
npm start
```

浏览器访问 `http://127.0.0.1:4173`。`npm run test:v22` 是接口集成测试，需要先启动服务，并会调用已配置的 AI 服务。

## Supabase 登录

在 `.env` 配置 `SUPABASE_URL` 与 `SUPABASE_PUBLISHABLE_KEY` 后，网页会启用邮箱注册/登录，业务 API 会校验 Supabase Access Token。Publishable Key 会通过 `/api/public-config` 下发给浏览器，这是 Supabase 设计的公开客户端密钥；不要把 `SUPABASE_SERVICE_ROLE_KEY` 放进前端或浏览器扩展。

创作者档案和项目采用浏览器本地 + Supabase 双写，登录后可跨设备加载。浏览器扩展支持每个用户独立连接码，旧的 `EXTENSION_IMPORT_TOKEN` 仅用于兼容测试；用户打开导入结果时需要登录，且只能领取属于自己的导入任务。

## Railway 临时部署

项目已包含 `Dockerfile` 与 `railway.json`。Railway 部署时会自动监听 `0.0.0.0:$PORT`，并通过 `/api/health` 检查服务状态。

1. 将源码放入私有 GitHub 仓库，确认 `.env` 未被提交。
2. Railway 新建项目并选择该仓库。
3. 在 Variables 中按 `.env.railway.example` 填写变量；真实 Key 只填写在 Railway。
4. 部署完成后在 Networking 点击 Generate Domain，获得 `https://xxx.up.railway.app`。
5. 把该地址加入 Supabase Authentication 的 Site URL 和 Redirect URLs。
6. 将该地址设为浏览器扩展默认 `appUrl`，再打包扩展。

生产容器默认设置 `LOCAL_ASR_ENABLED=false`，使用 DashScope ASR，避免 FunASR、Torch 和本地模型使镜像体积过大。等正式域名审核完成后，可在 Railway 绑定自定义域名，并同步更新 Supabase 跳转地址与扩展默认地址。

## 预留的内容解析接口

`POST /api/source/parse` 与 `GET /api/source/parse/:projectId` 已作为后续能力保留，但当前首页不调用；购买并联调内容解析 Provider 后再启用。

在 `.env` 中为各平台配置 `*_PROVIDER_URL` 和 `*_PROVIDER_TOKEN`。Provider 应接收服务端发送的 `{ url, platform }`；外部响应会在 `lib/providers` 内转换为统一结构，第三方原始对象不会进入分析业务层。生产环境应设置 `MEDIA_HOST_ALLOWLIST` 为实际媒体 CDN 域名。

Provider、媒体或 ASR 失败时，接口会返回可展示的错误或降级证据；首页始终保留正文/逐字稿手动输入入口。下载的视频和提取的音频只存在于系统临时目录，并在转写结束或异常后立即删除。

## Git / GitHub

`.env`、本地虚拟环境、依赖目录、日志、上传素材和生成视频均已忽略。仓库中只提交 `.env.example`，不要提交真实密钥。
