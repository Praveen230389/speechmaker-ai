#!/bin/bash

echo ""
echo "========================================"
echo " FIXING NLLB SMOKE TEST "
echo "========================================"
echo ""

REPORT="fix-nllb-report.txt"

rm -f $REPORT
touch $REPORT

log() {
    echo "$1"
    echo "$1" >> $REPORT
}

SMOKE="worker-smoke-test.sh"

if [ ! -f "$SMOKE" ]; then
    log "[FAIL] worker-smoke-test.sh not found"
    exit 1
fi

log "[INFO] Cleaning broken lines..."

# Remove broken inserted lines
sed -i '/n--src_lang/d' "$SMOKE"
sed -i '/--src_lang en/d' "$SMOKE"
sed -i '/--tgt_lang hi/d' "$SMOKE"
sed -i '/^en$/d' "$SMOKE"
sed -i '/^hi$/d' "$SMOKE"

log "[INFO] Locating NLLB command..."

LINE=$(grep -n "run_nllb.py" "$SMOKE" | head -1 | cut -d: -f1)

if [ -z "$LINE" ]; then
    log "[FAIL] Could not locate NLLB command"
    exit 1
fi

log "[OK] Found NLLB command at line $LINE"

TMPFILE=$(mktemp)

awk -v line="$LINE" '
NR==line {
    print $0 " --src_lang en --tgt_lang hi"
    next
}
{ print }
' "$SMOKE" > "$TMPFILE"

mv "$TMPFILE" "$SMOKE"

chmod +x "$SMOKE"

log "[OK] NLLB command patched"

echo ""
echo "========================================"
echo " PATCH COMPLETE "
echo "========================================"
echo ""

echo "NEXT:"
echo "./worker-smoke-test.sh"
echo ""
