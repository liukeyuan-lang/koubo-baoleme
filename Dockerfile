FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    LOCAL_ASR_ENABLED=false \
    PYTHON_BIN=python3

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir "edge-tts>=7.2,<8" \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p video-poc/assets video-poc/jobs

EXPOSE 4173
CMD ["npm", "start"]
