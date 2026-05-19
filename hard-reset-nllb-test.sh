#!/bin/bash

set -e

echo ""
echo "========================================"
echo " HARD RESETTING NLLB TEST BLOCK"
echo "========================================"
echo ""

TARGET="worker-smoke-test.sh"

if [ ! -f "$TARGET" ]; then
    echo "[FAIL] worker-smoke-test.sh not found"
    exit 1
fi

cp "$TARGET" "${TARGET}.bak-final"

python3 << 'EOF'
from pathlib import Path
import re

path = Path("worker-smoke-test.sh")
content = path.read_text()

pattern = r'echo ""\necho "=================================="\necho " NLLB WORKER TEST"\necho "=================================="\n.*?echo "\[FAIL\] NLLB worker failed"\nfi'

replacement = r'''echo ""
echo "=================================="
echo " NLLB WORKER TEST"
echo "=================================="

python3 python_workers/run_nllb.py \
  --transcript temp/test-job/transcript.json \
  --output temp/test-job/translated.json \
  --src_lang en \
  --tgt_lang hi >> $REPORT 2>&1

if [ $? -eq 0 ]; then
    echo "[OK] NLLB worker executed"
    echo "[OK] NLLB worker executed" >> $REPORT
else
    echo "[FAIL] NLLB worker failed"
    echo "[FAIL] NLLB worker failed" >> $REPORT
fi'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

path.write_text(new_content)

print("NLLB block fully replaced")
EOF

chmod +x worker-smoke-test.sh

echo ""
echo "[OK] NLLB block hard reset completed"
echo ""
echo "NEXT:"
echo "./worker-smoke-test.sh"
echo ""
