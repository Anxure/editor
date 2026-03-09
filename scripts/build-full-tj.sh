#!/usr/bin/env bash
set -euo pipefail

# Build for tj target:
# - clean output directory first
# - then run typecheck + vite build (full bundle config)

EDITOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep this in sync with `outDir` in `vite.config.full.ts` when BUILD_TARGET=tj
# 这是我本机的调用的项目生成目录，你可以根据自己目录修改路径
TARGET_DIR="${UMO_TJ_EDITOR_OUTDIR:-/Volumes/ykxDrive/work/tj-platform-web/packages/app-main/src/editor}"

if [[ -z "${TARGET_DIR}" ]]; then
  echo "ERROR: TARGET_DIR is empty."
  exit 1
fi

if [[ "${TARGET_DIR}" != /* ]]; then
  echo "ERROR: TARGET_DIR must be an absolute path. Got: ${TARGET_DIR}"
  exit 1
fi

# Safety guard: refuse to clean suspicious directories.
# Adjust this rule if you intentionally change the output location.
if [[ "${TARGET_DIR}" != */src/editor ]]; then
  echo "ERROR: Refusing to clean TARGET_DIR (must end with '/src/editor'). Got: ${TARGET_DIR}"
  echo "Set UMO_TJ_EDITOR_OUTDIR to override if you really know what you're doing."
  exit 1
fi

mkdir -p "${TARGET_DIR}"

echo "Cleaning output directory: ${TARGET_DIR}"
find "${TARGET_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

cd "${EDITOR_ROOT}"

echo "Typechecking..."
BUILD_TARGET=tj vue-tsc --noEmit

echo "Building (full, tj)..."
BUILD_TARGET=tj vite build --config vite.config.full.ts

echo "Done."

