#!/bin/bash
# DNS 설정 확인 스크립트

echo "=== hakchips.xyz DNS 설정 확인 ==="
echo ""

echo "A 레코드 확인:"
dig hakchips.xyz A +short | sort

echo ""
echo "=== 예상되는 IP 주소 ==="
echo "185.199.108.153"
echo "185.199.109.153"
echo "185.199.110.153"
echo "185.199.111.153"
echo ""

IP_COUNT=$(dig hakchips.xyz A +short | wc -l | tr -d ' ')

if [ "$IP_COUNT" -eq 4 ]; then
    echo "✅ DNS 설정이 올바르게 구성되었습니다! (4개의 A 레코드 확인됨)"
else
    echo "⚠️  DNS 설정이 아직 완료되지 않았습니다. (현재 $IP_COUNT 개의 레코드만 확인됨)"
    echo ""
    echo "GoDaddy에서 다음을 확인하세요:"
    echo "1. A 레코드 4개가 모두 추가되었는지 확인"
    echo "2. 각 A 레코드의 Value가 GitHub Pages IP 주소인지 확인"
    echo "3. 레코드가 저장되었는지 확인"
fi

echo ""
echo "=== CNAME 레코드 확인 (www) ==="
dig www.hakchips.xyz CNAME +short

