import os

filenames = ['roadmap_agent_llm.py', 'roadmap_agent.py']

for filename in filenames:
    try:
        # Read with latin1 to preserve all bytes exactly
        with open(filename, 'r', encoding='latin1') as f:
            content = f.read()
        print(f"Read {filename} using latin1")
    except Exception as ex:
        print(f"Failed to read {filename} with latin1: {ex}")
        continue
        
    # Replace absolute path or file name
    # We must encode the Korean characters to bytes and then decode them as latin1 to match the latin1 string in content!
    def to_latin1(s):
        # We try to search for the utf-8 or cp949 representation of the string in the file.
        # Since the file might be in cp949 or utf-8, let's generate both versions of the search strings.
        results = []
        for enc in ['utf-8', 'cp949']:
            try:
                results.append(s.encode(enc).decode('latin1'))
            except Exception:
                pass
        return results

    old_str1_candidates = to_latin1(r"c:\Security loadmap_Auto\2026년 KG그룹_제로인 정보보안감사_보안솔루션로드맵_v1.2.xlsx")
    old_str2_candidates = to_latin1("2026년 KG그룹_제로인 정보보안감사_보안솔루션로드맵_v1.2.xlsx")
    new_str_latin1 = "{올해}년 KG그룹_{기업명} 정보보안감사_보안솔루션로드맵_{생성일}.xlsx".encode('utf-8').decode('latin1') # We write it back in UTF-8
    
    # Also if the file is cp949 and we want to keep it as cp949, we can write it in cp949. But actually, writing it as UTF-8 bytes is fine, or CP949.
    # Since python files are recommended to be UTF-8, let's write it in UTF-8 bytes decoded as latin1.
    
    for old_str1 in old_str1_candidates:
        content = content.replace(old_str1, new_str_latin1)
    for old_str2 in old_str2_candidates:
        content = content.replace(old_str2, new_str_latin1)
    
    # Replace the variable definition to make it relative
    def_candidates_old = to_latin1('ROADMAP_TEMPLATE_PATH = r"{올해}년 KG그룹_{기업명} 정보보안감사_보안솔루션로드맵_{생성일}.xlsx"') + to_latin1('ROADMAP_TEMPLATE_PATH = "{올해}년 KG그룹_{기업명} 정보보안감사_보안솔루션로드맵_{생성일}.xlsx"')
    def_new = 'ROADMAP_TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "{올해}년 KG그룹_{기업명} 정보보안감사_보안솔루션로드맵_{생성일}.xlsx")'.encode('utf-8').decode('latin1')
    
    for def_old in def_candidates_old:
        content = content.replace(def_old, def_new)

    with open(filename, 'w', encoding='latin1') as f:
        f.write(content)
    print(f"Successfully updated {filename}")
