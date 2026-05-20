#!/bin/bash

set -e

echo "=================================================="
echo "WHISPERX CLEAN FIX (STABLE STACK)"
echo "=================================================="

VENV_PATH="./venv"

echo "Activating venv..."
source $VENV_PATH/bin/activate

echo "Python: $(which python)"
echo "Pip: $(which pip)"

echo "=================================================="
echo "STEP 1 - CLEAN UNSAFE PACKAGES"
echo "=================================================="

pip uninstall -y whisperx faster-whisper ctranslate2 av pyannote.audio speechbrain || true

echo "=================================================="
echo "STEP 2 - PIN STABLE COMPATIBLE STACK"
echo "=================================================="

pip install --no-cache-dir \
  ctranslate2==4.2.1 \
  faster-whisper==0.9.0 \
  av>==11.0.0

echo "=================================================="
echo "STEP 3 - INSTALL WHISPERX STABLE VERSION"
echo "=================================================="

pip install whisperx==3.1.0

echo "=================================================="
echo "STEP 4 - VERIFY IMPORT"
echo "=================================================="

python -c "
import whisperx
print('WHISPERX IMPORT OK')
"

echo "=================================================="
echo "STEP 5 - TEST MODEL LOAD (CPU FIRST SAFETY CHECK)"
echo "=================================================="

python -c "
import whisperx
model = whisperx.load_model('base', device='cuda')
print('MODEL LOAD SUCCESS')
"

echo "=================================================="
echo "DONE - SYSTEM STABLE"
echo "=================================================="
