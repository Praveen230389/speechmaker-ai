#!/bin/bash

set -e

echo "=================================================="
echo "STEP 1 - ACTIVATING VENV"
echo "=================================================="

source venv/bin/activate

echo "Python:"
which python

echo "Pip:"
which pip

echo "=================================================="
echo "STEP 2 - SYSTEM FFMPEG + BUILD LIBS"
echo "=================================================="

sudo apt update

sudo apt install -y \
ffmpeg \
pkg-config \
build-essential \
python3-dev \
libavformat-dev \
libavcodec-dev \
libavdevice-dev \
libavutil-dev \
libavfilter-dev \
libswscale-dev \
libswresample-dev

echo "=================================================="
echo "STEP 3 - REMOVE BROKEN / CONFLICTING PACKAGES"
echo "=================================================="

pip uninstall -y \
whisperx \
faster-whisper \
ctranslate2 \
transformers \
tokenizers \
huggingface-hub \
av \
pyannote.audio \
speechbrain

echo "=================================================="
echo "STEP 4 - CLEAR PIP CACHE"
echo "=================================================="

pip cache purge || true

echo "=================================================="
echo "STEP 5 - INSTALL CORE TORCH CUDA STACK"
echo "=================================================="

pip install \
torch==2.3.1 \
torchaudio==2.3.1 \
--index-url https://download.pytorch.org/whl/cu121

echo "=================================================="
echo "STEP 6 - INSTALL TRANSFORMERS STACK"
echo "=================================================="

pip install \
transformers==4.39.3 \
tokenizers==0.15.2 \
safetensors \
huggingface-hub==0.36.2

echo "=================================================="
echo "STEP 7 - INSTALL CTRANSLATE + FASTER WHISPER"
echo "=================================================="

pip install \
ctranslate2==4.4.0 \
faster-whisper==0.10.0

echo "=================================================="
echo "STEP 8 - INSTALL WHISPERX"
echo "=================================================="

pip install whisperx==3.1.1

echo "=================================================="
echo "STEP 9 - VERIFY CUDA"
echo "=================================================="

python -c "
import torch
print('CUDA AVAILABLE:', torch.cuda.is_available())
print('CUDA DEVICE COUNT:', torch.cuda.device_count())
print('CUDA DEVICE:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NONE')
"

echo "=================================================="
echo "STEP 10 - VERIFY FASTER WHISPER"
echo "=================================================="

python -c "
from faster_whisper import WhisperModel

print('Loading Faster Whisper Model...')
model = WhisperModel('base', device='cuda')

print('FASTER WHISPER SUCCESS')
"

echo "=================================================="
echo "STEP 11 - VERIFY WHISPERX IMPORT"
echo "=================================================="

python -c "
import whisperx

print('WHISPERX IMPORT SUCCESS')
"

echo "=================================================="
echo "STEP 12 - VERIFY WHISPERX MODEL LOAD"
echo "=================================================="

python -c "
import whisperx

print('Loading WhisperX model...')
model = whisperx.load_model('base', 'cuda')

print('WHISPERX MODEL SUCCESS')
"

echo "=================================================="
echo "STEP 13 - CREATE TEST AUDIO"
echo "=================================================="

ffmpeg -f lavfi -i sine=frequency=1000:duration=5 test.wav -y

echo "=================================================="
echo "STEP 14 - RUN TEST TRANSCRIPTION"
echo "=================================================="

python -c "
from faster_whisper import WhisperModel

model = WhisperModel('base', device='cuda')

segments, info = model.transcribe('test.wav')

print('Detected language:', info.language)

for segment in segments:
    print(segment.text)
"

echo "=================================================="
echo "ALL TESTS COMPLETED"
echo "=================================================="
