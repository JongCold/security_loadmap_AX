import openpyxl
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROADMAP_TEMPLATE_PATH = os.path.join(BASE_DIR, "2026년 KG그룹_제로인 정보보안감사_보안솔루션로드맵_v1.2.xlsx")

wb = openpyxl.load_workbook(ROADMAP_TEMPLATE_PATH)
sheet = wb.worksheets[1] # 01_ 시트
print(f"Sheet Name: {sheet.title}")

print("Merged cells:")
for merge_range in list(sheet.merged_cells.ranges):
    print(merge_range)
