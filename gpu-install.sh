#!/bin/bash

echo ""
echo "======================================="
echo " AI DUBBING GPU INSTALLER "
echo "======================================="
echo ""

# -----------------------------------
# BASIC CHECKS
# -----------------------------------

echo "[1/10] Checking Python..."

python3 --version

if [ $? -ne 0 ]; then
    echo "[ERROR] Python3 not found"
    exit 1
fi

echo ""
echo "[2/10] Checking Node..."

node -v

if [ $? -ne 0 ]; then
    echo "[ERROR] Node.js not found"
    exit 1
fi

echo ""
echo "[3/10] Checking ffmpeg..."

ffmpeg -version > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "[ERROR] ffmpeg not found"
    exit 1
fi

echo "[OK] ffmpeg found"

echo ""
echo "[4/10] Creating fresh virtual environment..."

rm -rf venv

python3 -m venv venv

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed creating venv"
    exit 1
fi

echo "[OK] venv created"

echo ""
echo "[5/10] Activating venv..."

source venv/bin/activate

echo ""
echo "[6/10] Upgrading pip..."

pip install --upgrade pip setuptools wheel

echo ""
echo "[7/10] Installing CUDA-safe PyTorch..."

pip install torch==2.1.2 torchaudio==2.1.2 torchvision==0.16.2

if [ $? -ne 0 ]; then
    echo "[ERROR] Torch installation failed"
    exit 1
fi

echo ""
echo "[8/10] Installing base AI dependencies..."

pip install \
numpy \
scipy \
pydub \
ffmpeg-python \
transformers \
sentencepiece \
accelerate \
soundfile

echo ""
echo "[9/10] Installing Whisper..."

pip install openai-whisper

echo ""
echo "[10/10] Installing XTTS..."

pip install TTS==0.22.0

echo ""
echo "======================================="
echo " VERIFYING INSTALLATION "
echo "======================================="
echo ""

python3 <<EOF

import torch

print("CUDA AVAILABLE:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))

print("")

try:
    import whisper
    print("[OK] Whisper imported")
except Exception as e:
    print("[FAIL] Whisper:", e)

try:
    from TTS.api import TTS
    print("[OK] XTTS imported")
except Exception as e:
    print("[FAIL] XTTS:", e)

EOF

echo ""
echo "======================================="
echo " INSTALL COMPLETED "
echo "======================================="
echo ""

echo "NEXT STEP:"
echo "source venv/bin/activate"
echo "npm install"
echo "npm run dev"
echo ""
