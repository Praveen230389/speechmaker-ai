#!/bin/bash

echo ""
echo "========================================"
echo " WORKER PATCH SCRIPT "
echo "========================================"
echo ""

REPORT="patch-report.txt"

rm -f $REPORT
touch $REPORT

log() {
    echo "$1"
    echo "$1" >> $REPORT
}

# ----------------------------------------
# ACTIVATE VENV
# ----------------------------------------

source venv/bin/activate

# ----------------------------------------
# PATCH WHISPER WORKER
# ----------------------------------------

TARGET="python_workers/run_whisperx.py"

log ""
log "=================================="
log " PATCHING WHISPER WORKER "
log "=================================="

if [ -f "$TARGET" ]; then

    # Ensure json import exists at top
    grep -q "^import json" "$TARGET"

    if [ $? -ne 0 ]; then
        sed -i '1i import json' "$TARGET"
        log "[OK] Added global json import"
    fi

    # Remove accidental local json assignment/import
    sed -i '/^[[:space:]]*import json$/d' "$TARGET"

    # Re-add clean global import
    sed -i '1i import json' "$TARGET"

    # Force CPU mode safety
    sed -i 's/device="cuda"/device="cpu"/g' "$TARGET"
    sed -i "s/device='cuda'/device='cpu'/g" "$TARGET"

    # Force compute type safe mode
    sed -i 's/compute_type="float16"/compute_type="int8"/g' "$TARGET"
    sed -i "s/compute_type='float16'/compute_type='int8'/g" "$TARGET"

    log "[OK] CPU safety patches applied"

else
    log "[FAIL] run_whisperx.py not found"
fi

# ----------------------------------------
# PATCH SMOKE TEST NLLB ARGS
# ----------------------------------------

SMOKE="worker-smoke-test.sh"

log ""
log "=================================="
log " PATCHING SMOKE TEST "
log "=================================="

if [ -f "$SMOKE" ]; then

    sed -i 's/--input/--transcript/g' "$SMOKE"

    # Add src_lang if missing
    grep -q "src_lang" "$SMOKE"

    if [ $? -ne 0 ]; then

        sed -i '/run_nllb.py/a \\\n--src_lang en \\\n--tgt_lang hi \\' "$SMOKE"

    fi

    log "[OK] Smoke test patched"

else
    log "[FAIL] worker-smoke-test.sh not found"
fi

# ----------------------------------------
# VERIFY PATCHES
# ----------------------------------------

log ""
log "=================================="
log " VERIFYING PATCHES "
log "=================================="

grep -n "import json" "$TARGET" >> $REPORT 2>&1
grep -n "device=" "$TARGET" >> $REPORT 2>&1
grep -n "compute_type" "$TARGET" >> $REPORT 2>&1

log "[OK] Verification complete"

# ----------------------------------------
# DONE
# ----------------------------------------

log ""
log "=================================="
log " PATCH COMPLETED "
log "=================================="

echo ""
echo "========================================"
echo " DONE "
echo "========================================"
echo ""

echo "NEXT:"
echo "./worker-smoke-test.sh"
echo ""
