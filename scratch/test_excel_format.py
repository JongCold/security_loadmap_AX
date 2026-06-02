import os
import sys

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import roadmap_agent_llm_new as agent

test_results = [
    {
        "항목명": "1. 정책, 조직 관리",
        "세부점검내용": "▶ 수립한 정보보호 규정을 정보보호 관리자...\n▶ 규정(지침, 절차 등)은 조직이 제공하고 있는 서비스...",
        "운영현황_증적": "● KG그룹 표준 규정 및 지침 16종을 제공함",
        "개선방안": "규정(지침, 절차 등)은 조직이 제공하고 있는 서비스, 사업 등에 관련한 개인정보 보호 관련...",
        "보안영역": "정보보안",
        "과제명": "정보보안 컨설팅 수행",
        "법적요구": "N/A",
        "시급성": 4,
        "위험도": 2,
        "예상예산": "₩30,000,000",
        "로드맵연도": "2026년",
        "비고": "[추천 솔루션] AhnLab - V3 Office Security\n[선정 이유] 악성코드 감염 위험을 줄이기 위해 백신을 도입하며, 중앙 관리를 통해 일관된 보안 정책을 수립하고자 함."
    },
    {
        "항목명": "6. 인증 및 권한관리",
        "세부점검내용": "▶ 사용자 계정 및 권한 등록, 변경, 삭제 절차 수립\n▶ 중요 시스템 접속 시 2단계 인증 적용",
        "운영현황_증적": "● 중요 시스템 로그인 시 OTP 인증 미흡",
        "개선방안": "OTP 솔루션을 도입하여 로그인 시 다중 인증(MFA)을 강제화하도록 조치해야 함.",
        "보안영역": "인프라 보안",
        "과제명": "이차 인증 솔루션 구축",
        "법적요구": "개인정보보호법 제29조",
        "시급성": 5,
        "위험도": 4,
        "예상예산": "₩15,000,000",
        "로드맵연도": "2026년",
        "비고": "[추천 솔루션] Genians - Genian OTP\n[선정 이유] 사용자 인증 강화 및 내부망 중요 자원 접근 시 강력한 모바일 OTP 수단을 제공합니다. 다중 요소 인증 체계를 정착시켜 비밀번호 유출 사고를 방지합니다."
    }
]

output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_formatted_output.xlsx")

try:
    print("엑셀 생성 시작...")
    agent.generate_roadmap_excel(test_results, "테스트고객사", output_file)
    print(f"✅ 엑셀 파일이 성공적으로 생성되었습니다: {output_file}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"❌ 엑셀 생성 중 에러 발생: {e}")
