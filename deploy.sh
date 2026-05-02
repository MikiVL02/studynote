#!/usr/bin/env bash
# deploy.sh — 本地运行，构建并上传到 VPS
set -euo pipefail

VPS_USER="root"
VPS_HOST="your.vps.ip"   # ← 替换为你的 VPS IP 或域名
VPS_DIR="/opt/mikivl"

info()  { printf "\033[36m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[32m[OK]\033[0m    %s\n" "$*"; }
die()   { printf "\033[31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }

# ── Step 1: 本地构建 ──────────────────────────────────────────────────────────
info "Building Vite app (base=/app/) ..."
npm run build
ok "Build complete → dist/"

# ── Step 2: 上传文件 ──────────────────────────────────────────────────────────
info "Uploading to ${VPS_USER}@${VPS_HOST}:${VPS_DIR} ..."

ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_DIR}/{homepage,app,nginx,program1/server,program1/node_modules}"

# 个人主页
scp homepage/index.html "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/homepage/"

# App 构建产物
rsync -az --delete dist/ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/app/"

# 后端源码
rsync -az server/ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/program1/server/"
scp package.json package-lock.json "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/program1/"

# Nginx 配置 + Docker Compose
scp nginx/default.conf "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/nginx/"
scp docker-compose.yml "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

ok "Upload complete."

# ── Step 3: VPS 上安装依赖并重启服务 ─────────────────────────────────────────
info "Restarting services on VPS ..."

ssh "${VPS_USER}@${VPS_HOST}" bash <<'REMOTE'
set -euo pipefail
cd /opt/mikivl/program1
npm ci --omit=dev
cd /opt/mikivl
docker compose up -d --remove-orphans
docker compose ps
REMOTE

ok "Deployment complete! → https://www.mikivl.online"
