#!/bin/bash

echo ""
echo "======================================="
echo " AI DUBBING REPO INTELLIGENCE SCANNER "
echo "======================================="
echo ""

REPORT_DIR="repo-analysis"

mkdir -p $REPORT_DIR

ARCH_REPORT="$REPORT_DIR/architecture-report.txt"
PYTHON_REPORT="$REPORT_DIR/python-dependencies.txt"
NODE_REPORT="$REPORT_DIR/node-dependencies.txt"
GPU_REPORT="$REPORT_DIR/gpu-analysis.txt"
SPAWN_REPORT="$REPORT_DIR/spawn-analysis.txt"
ENV_REPORT="$REPORT_DIR/env-analysis.txt"
RISK_REPORT="$REPORT_DIR/risk-report.txt"

rm -f $REPORT_DIR/*

echo "[INFO] Collecting system info..."

echo "=========== SYSTEM INFO ===========" > $ARCH_REPORT

echo "" >> $ARCH_REPORT
date >> $ARCH_REPORT

echo "" >> $ARCH_REPORT
uname -a >> $ARCH_REPORT

echo "" >> $ARCH_REPORT
lsb_release -a >> $ARCH_REPORT 2>/dev/null

echo ""
echo "[INFO] Scanning repository structure..."

echo "" >> $ARCH_REPORT
echo "=========== REPO STRUCTURE ===========" >> $ARCH_REPORT

find . -maxdepth 4 >> $ARCH_REPORT

echo ""
echo "[INFO] Detecting important files..."

echo "" >> $ARCH_REPORT
echo "=========== IMPORTANT FILES ===========" >> $ARCH_REPORT

find . \( \
-name "package.json" -o \
-name "requirements.txt" -o \
-name "Dockerfile" -o \
-name "docker-compose.yml" -o \
-name "server.ts" -o \
-name ".env" -o \
-name ".env.local" -o \
-name "vite.config.ts" -o \
-name "tsconfig.json" -o \
-name "Jenkinsfile" \
\) >> $ARCH_REPORT

echo ""
echo "[INFO] Extracting Node.js dependencies..."

echo "=========== NODE DEPENDENCIES ===========" > $NODE_REPORT

find . -name "package.json" | while read file
do
    echo "" >> $NODE_REPORT
    echo "FILE: $file" >> $NODE_REPORT
    cat "$file" >> $NODE_REPORT 2>/dev/null
done

echo ""
echo "[INFO] Extracting Python dependencies..."

echo "=========== PYTHON DEPENDENCIES ===========" > $PYTHON_REPORT

find . \( -name "*.py" -o -name "requirements.txt" \) | while read file
do
    echo "" >> $PYTHON_REPORT
    echo "FILE: $file" >> $PYTHON_REPORT

    grep -Ei \
    "torch|torchaudio|whisper|whisperx|faster_whisper|TTS|pyannote|transformers|ffmpeg|pydub|cuda|device=|compute_type" \
    "$file" >> $PYTHON_REPORT 2>/dev/null
done

echo ""
echo "[INFO] Analyzing Node -> Python spawn logic..."

echo "=========== SPAWN ANALYSIS ===========" > $SPAWN_REPORT

find . \( -name "*.ts" -o -name "*.js" \) | while read file
do
    grep -Ein \
    "spawn|exec|python|python3|venv|child_process" \
    "$file" >> $SPAWN_REPORT 2>/dev/null
done

echo ""
echo "[INFO] Scanning environment variables..."

echo "=========== ENVIRONMENT ANALYSIS ===========" > $ENV_REPORT

find . -name ".env*" | while read file
do
    echo "" >> $ENV_REPORT
    echo "FILE: $file" >> $ENV_REPORT
    cat "$file" >> $ENV_REPORT 2>/dev/null
done

echo ""
echo "[INFO] Running GPU analysis..."

echo "=========== GPU ANALYSIS ===========" > $GPU_REPORT

echo "" >> $GPU_REPORT
echo "NVIDIA-SMI OUTPUT:" >> $GPU_REPORT

nvidia-smi >> $GPU_REPORT 2>&1

echo "" >> $GPU_REPORT
echo "CUDA PATH:" >> $GPU_REPORT

echo $CUDA_PATH >> $GPU_REPORT

echo "" >> $GPU_REPORT
echo "PYTHON VERSION:" >> $GPU_REPORT

python3 --version >> $GPU_REPORT 2>&1

echo "" >> $GPU_REPORT
echo "NODE VERSION:" >> $GPU_REPORT

node -v >> $GPU_REPORT 2>&1

echo "" >> $GPU_REPORT
echo "NPM VERSION:" >> $GPU_REPORT

npm -v >> $GPU_REPORT 2>&1

echo "" >> $GPU_REPORT
echo "FFMPEG VERSION:" >> $GPU_REPORT

ffmpeg -version >> $GPU_REPORT 2>&1

echo ""
echo "[INFO] Generating risk report..."

echo "=========== RISK REPORT ===========" > $RISK_REPORT

grep -R "whisperx" . >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "[HIGH RISK] WhisperX detected" >> $RISK_REPORT
fi

grep -R "pyannote" . >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "[HIGH RISK] pyannote detected" >> $RISK_REPORT
fi

grep -R "TTS" . >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "[INFO] XTTS/TTS detected" >> $RISK_REPORT
fi

which ffmpeg >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "[CRITICAL] ffmpeg not found" >> $RISK_REPORT
fi

which nvidia-smi >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "[CRITICAL] NVIDIA tools not found" >> $RISK_REPORT
fi

echo ""
echo "======================================="
echo " SCAN COMPLETED "
echo "======================================="
echo ""

echo "Generated Reports:"
echo ""

ls -lh $REPORT_DIR

echo ""
echo "NEXT STEP:"
echo "Check:"
echo "1. gpu-analysis.txt"
echo "2. risk-report.txt"
echo "3. spawn-analysis.txt"
echo ""
