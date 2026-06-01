import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = "roadmap_agent_llm_new.py"
try:
    with open(file_path, "rb") as f:
        content = f.read()
    
    # 디코딩 시도
    lines = content.split(b'\n')
    for i, line in enumerate(lines):
        try:
            line.decode('utf-8')
        except UnicodeDecodeError as e:
            print(f"Line {i+1} has decoding error: {e}")
            print(f"Raw bytes: {line}")
except Exception as e:
    print(f"Error: {e}")
