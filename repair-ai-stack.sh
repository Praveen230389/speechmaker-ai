#!/bin/bash

echo ""
echo "========================================"
echo " AI STACK REPAIR + ALIGNMENT SCRIPT "
echo "========================================"
echo ""

REPORT="repair-report.txt"

rm -f $REPORT
touch $REPORT

log() {
    echo "$1"
    echo "$1" >> $REPORT
}

# ---------------------------------------
# ACTIVATE VENV
# ---------------------------------------

log "=================================="
log " ACTIVATING VENV "
log "=================================="

source venv/bin/activate

if [ $? -ne 0 ]; then
    log "[FAIL] Could not activate venv"
    exit 1
fi

log "[OK] venv activated"

# ---------------------------------------
# REMOVE BROKEN DEPENDENCIES
# ---------------------------------------

log ""
log "=================================="
log " REMOVING OLD AI STACK "
log "=================================="

pip uninstall -y \
torch \
torchaudio \
torchvision \
transformers \
TTS \
whisperx \
faster-whisper \
ctranslate2 \
pyannote.audio \
pyannote.core \
pyannote.pipeline \
openai-whisper \
>> $REPORT 2>&1

log "[OK] Old stack removed"

# ---------------------------------------
# CLEAN CACHE
# ---------------------------------------

log ""
log "=================================="
log " CLEANING CACHE "
log "=================================="

pip cache purge >> $REPORT 2>&1

rm -rf ~/.cache/huggingface
rm -rf ~/.cache/torch
rm -rf ~/.cache/whisper

log "[OK] Cache cleaned"

# ---------------------------------------
# INSTALL MODERN TORCH
# ---------------------------------------

log ""
log "=================================="
log " INSTALLING MODERN TORCH "
log "=================================="

pip install \
torch==2.4.0 \
torchaudio==2.4.0 \
torchvision==0.19.0 \
>> $REPORT 2>&1

if [ $? -ne 0 ]; then
    log "[FAIL] Torch installation failed"
    exit 1
fi

log "[OK] Torch installed"

# ---------------------------------------
# INSTALL TRANSFORMERS STACK
# ---------------------------------------

log ""
log "=================================="
log " INSTALLING TRANSFORMERS STACK "
log "=================================="

pip install \
transformers==4.46.3 \
accelerate \
sentencepiece \
safetensors \
>> $REPORT 2>&1

if [ $? -ne 0 ]; then
    log "[FAIL] Transformers installation failed"
    exit 1
fi

log "[OK] Transformers installed"

# ---------------------------------------
# INSTALL WHISPER
# ---------------------------------------

log ""
log "=================================="
log " INSTALLING WHISPER "
log "=================================="

pip install openai-whisper >> $REPORT 2>&1

log "[OK] Whisper installed"

# ---------------------------------------
# INSTALL XTTS
# ---------------------------------------

log ""
log "=================================="
log " INSTALLING XTTS "
log "=================================="

pip install TTS==0.22.0 >> $REPORT 2>&1

if [ $? -ne 0 ]; then
    log "[FAIL] XTTS installation failed"
    exit 1
fi

log "[OK] XTTS installed"

# ---------------------------------------
# FIX SETUPTOOLS
# ---------------------------------------

log ""
log "=================================="
log " FIXING SETUPTOOLS "
log "=================================="

pip install setuptools==69.5.1 >> $REPORT 2>&1

log "[OK] setuptools aligned"

# ---------------------------------------
# PATCH WHISPER MODEL SIZE
# ---------------------------------------

log ""
log "=================================="
log " PATCHING WHISPER WORKER "
log "=================================="

TARGET_FILE="python_workers/run_whisperx.py"

if [ -f "$TARGET_FILE" ]; then

    sed -i 's/large-v2/base/g' "$TARGET_FILE"
    sed -i 's/large/base/g' "$TARGET_FILE"

    log "[OK] Whisper worker patched to base model"

else
    log "[FAIL] run_whisperx.py not found"
fi

# ---------------------------------------
# VERIFY INSTALLS
# ---------------------------------------

log ""
log "=================================="
log " VERIFYING INSTALLS "
log "=================================="

python3 <<EOF >> $REPORT 2>&1

import torch
print("TORCH:", torch.__version__)
print("CUDA:", torch.cuda.is_available())

try:
    import whisper
    print("WHISPER OK")
except Exception as e:
    print("WHISPER FAIL:", e)

try:
    from transformers import pipeline
    print("TRANSFORMERS OK")
except Exception as e:
    print("TRANSFORMERS FAIL:", e)

try:
    from TTS.api import TTS
    print("XTTS OK")
except Exception as e:
    print("XTTS FAIL:", e)

EOF

log "[OK] Verification completed"

# ---------------------------------------
# DONE
# ---------------------------------------

log ""
log "=================================="
log " REPAIR COMPLETED "
log "=================================="

echo ""
echo "========================================"
echo " DONE "
echo "========================================"
echo ""

echo "NEXT:"
echo "./worker-smoke-test.sh"
echo ""
