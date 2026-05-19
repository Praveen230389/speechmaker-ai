#!/bin/bash

echo ""
echo "========================================"
echo " REWRITING NLLB TEST SECTION "
echo "========================================"
echo ""

REPORT="rewrite-nllb-report.txt"

rm -f $REPORT
touch $REPORT

log() {
    echo "$1"
    echo "$1" >> $REPORT
}

TARGET="worker-smoke-test.sh"

if [ ! -f "$TARGET" ]; then
    log "[FAIL] worker-smoke-test.sh not found"
    exit 1
fi

log "[INFO] Backing up original file..."

cp "$TARGET" "${TARGET}.bak"

log "[OK] Backup created"

log "[INFO] Rewriting NLLB section..."

python3 << 'PYTHONPATCH'

from pathlib import Path
import re

path = Path("worker-smoke-test.sh")

content = path.read_text()

pattern = r'echo "=================================="\necho " NLLB WORKER TEST"\necho "=================================="(.*?)echo ""'

replacement = r'''echo "=================================="
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
fi

echo ""
'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

path.write_text(new_content)

print("NLLB section rewritten successfully")

PYTHONPATCH

chmod +x "$TARGET"

log "[OK] Rewrite completed"

echo ""
echo "========================================"
echo " REWRITE COMPLETE "
echo "========================================"
echo ""

echo "NEXT:"
echo "./worker-smoke-test.sh"
echo ""
