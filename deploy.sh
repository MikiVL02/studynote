#!/usr/bin/env bash
# deploy.sh — 本地运行，构建并上传到 VPS
# 架构：Caddy (host) + Node.js systemd service (host)
set -euo pipefail

VPS_HOST="mikivl"
VPS_DIR="/opt/mikivl"
# 主页文件位置（使用 mikivl.online 主仓库的最新版本）
HOMEPAGE_SRC="../mikivl.online/index.html"

info()  { printf "\033[36m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[32m[OK]\033[0m    %s\n" "$*"; }
die()   { printf "\033[31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }

# ── Step 1: 本地构建 ──────────────────────────────────────────────────────────
info "Building Vite app ..."
npm run build
ok "Build complete → dist/"

# ── Step 2: 上传文件 ──────────────────────────────────────────────────────────
info "Uploading to ${VPS_HOST}:${VPS_DIR} ..."

# 个人主页（从主仓库上传最新版本）
if [ -f "${HOMEPAGE_SRC}" ]; then
  scp "${HOMEPAGE_SRC}" "${VPS_HOST}:${VPS_DIR}/homepage/index.html"
  ok "Homepage uploaded from ${HOMEPAGE_SRC}"
else
  die "Homepage source not found: ${HOMEPAGE_SRC}"
fi

# App 构建产物 → note 目录（Caddy 的 note.mikivl.online root）
rsync -az --delete dist/ "${VPS_HOST}:${VPS_DIR}/note/"

# 后端源码
rsync -az server/ "${VPS_HOST}:${VPS_DIR}/program1/server/"
scp package.json package-lock.json "${VPS_HOST}:${VPS_DIR}/program1/"

ok "Upload complete."

# ── Step 3: VPS 上安装依赖并重启服务 ─────────────────────────────────────────
info "Installing dependencies and restarting program1 service on VPS ..."

ssh "${VPS_HOST}" bash <<'REMOTE'
set -euo pipefail
NODE=/root/.nvm/versions/node/v24.15.0/bin/node
NPM=/root/.nvm/versions/node/v24.15.0/bin/npm

cd /opt/mikivl/program1
${NPM} ci --ignore-scripts

# 检查 better-sqlite3 是否需要重新编译
REQUIRED_VERSION=$(${NODE} -e "process.stdout.write(String(process.versions.modules))")
BUILT_VERSION=$(${NODE} -e "
try {
  const b = require('./node_modules/better-sqlite3');
  process.stdout.write('ok');
} catch(e) {
  process.stdout.write('rebuild');
}
" 2>/dev/null || echo "rebuild")

if [ "${BUILT_VERSION}" = "rebuild" ]; then
  echo "[INFO] Rebuilding better-sqlite3 for Node $(${NODE} -v) ..."
  cd node_modules/better-sqlite3
  ${NODE} /root/.nvm/versions/node/v24.15.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild
  cd ../..
fi

systemctl restart program1.service
sleep 3
systemctl is-active program1.service && echo "[OK] program1.service is running"
REMOTE

ok "Deployment complete! → https://note.mikivl.online"
