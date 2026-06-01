import openpyxl
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file = os.path.join(BASE_DIR, "KG그룹 정보보안감사_사전환경조사서_양식.xlsx")

wb = openpyxl.load_workbook(env_file, data_only=True)
sheet = wb.worksheets[2] # 3번째 시트 'KG그룹(가족사명)'
print(f"Sheet Name: {sheet.title}")

for r in range(1, 12):
    row_vals = []
    for c in range(1, 16):
        val = sheet.cell(row=r, column=c).value
        row_vals.append(val)
    print(f"Row {r}: {row_vals}")

# 병합된 셀 정보 목록 중 1~12행 범위만 출력
print("\n--- Merged Ranges in 1~12 rows ---")
for r_range in list(sheet.merged_cells.ranges):
    if r_range.min_row <= 12:
        print(r_range)
