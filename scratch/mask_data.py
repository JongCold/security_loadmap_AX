import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 마스킹 대상 마크다운 파일들
files_to_mask = [
    "3차 개발 완료 보고서.md",
    "4차 개발 완료 보고서.md",
    "5차 개발 완료 보고서.md",
    "개발 기획.md",
    "완료 보고.md",
    "완료 보고서.md",
    "최종 종합 결과 보고서.md",
    "트러블 슈핑 전체 보고서.md"
]

# 치환 규칙
replacement_rules = {
    r"KG그룹": "OO그룹",
    r"KG이니시스": "OO이니시스",
    r"KG제로인": "OO제로인",
    r"KG모빌리티": "OO모빌리티",
    r"KGICT": "OOICT",
    r"KG파이낸셜": "OO파이낸셜",
    r"류장원 팀장": "OOO 팀장",
    r"이강민": "OOO"
}

def mask_files():
    print("=== 마스킹 작업 시작 ===")
    for filename in files_to_mask:
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"파일 없음: {filename}")
            continue
            
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        original_content = content
        for pattern, replacement in replacement_rules.items():
            content = re.sub(pattern, replacement, content)
            
        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ 마스킹 완료: {filename}")
        else:
            print(f"변경 없음: {filename}")

if __name__ == "__main__":
    mask_files()
