#!/bin/bash

REPORT="worker-test-report.txt"

rm -f $REPORT

echo "==================================" | tee -a $REPORT
echo " ACTIVATING VENV" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

source venv/bin/activate

if [ $? -eq 0 ]; then
    echo "[OK] venv activated" | tee -a $REPORT
else
    echo "[FAIL] venv failed" | tee -a $REPORT
    exit 1
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " BASIC ENVIRONMENT CHECKS" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 --version >> $REPORT 2>&1
node -v >> $REPORT 2>&1
npm -v >> $REPORT 2>&1

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " TORCH TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 -c "
import torch
print('TORCH VERSION:', torch.__version__)
print('CUDA AVAILABLE:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
else:
    print('CPU MODE ACTIVE')
" >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] Torch test passed" | tee -a $REPORT
else
    echo "[FAIL] Torch test failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " WHISPER IMPORT TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 -c "import whisper; print('WHISPER IMPORT OK')" >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] Whisper import passed" | tee -a $REPORT
else
    echo "[FAIL] Whisper import failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " XTTS IMPORT TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 -c "from TTS.api import TTS; print('XTTS IMPORT OK')" >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] XTTS import passed" | tee -a $REPORT
else
    echo "[FAIL] XTTS import failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " FFMPEG TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

ffmpeg -version >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] ffmpeg available" | tee -a $REPORT
else
    echo "[FAIL] ffmpeg missing" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " WORKER FILE CHECK" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

FILES=(
    "python_workers/run_whisperx.py"
    "python_workers/run_nllb.py"
    "python_workers/run_xtts.py"
    "python_workers/run_pydub.py"
)

for file in "${FILES[@]}"
do
    if [ -f "$file" ]; then
        echo "[OK] Found $file" | tee -a $REPORT
    else
        echo "[FAIL] Missing $file" | tee -a $REPORT
    fi
done

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " TEST DIRECTORY SETUP" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

mkdir -p temp/test-job
mkdir -p test-assets

echo "[OK] Test directories created" | tee -a $REPORT

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " GENERATING TEST AUDIO" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

ffmpeg -f lavfi -i "sine=frequency=1000:duration=3" test-assets/test-tone.wav -y >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] Test audio generated" | tee -a $REPORT
else
    echo "[FAIL] Test audio generation failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " WHISPER WORKER TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 python_workers/run_whisperx.py \
  --audio test-assets/test-tone.wav \
  --output temp/test-job/transcript.json >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] Whisper worker executed" | tee -a $REPORT
else
    echo "[FAIL] Whisper worker failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " NLLB WORKER TEST" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

python3 python_workers/run_nllb.py \
  --transcript temp/test-job/transcript.json \
  --output temp/test-job/translated.json \
  --src_lang en \
  --tgt_lang hi >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] NLLB worker executed" | tee -a $REPORT
else
    echo "[FAIL] NLLB worker failed" | tee -a $REPORT
fi

echo "" | tee -a $REPORT
echo "==================================" | tee -a $REPORT
echo " SMOKE TEST COMPLETED" | tee -a $REPORT
echo "==================================" | tee -a $REPORT

echo "" | tee -a $REPORT
echo "REPORT LOCATION:" | tee -a $REPORT
echo "worker-test-report.txt" | tee -a $REPORT
