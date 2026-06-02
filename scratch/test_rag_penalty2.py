import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import rag_engine

sys.stdout.reconfigure(encoding='utf-8')

try:
    engine = rag_engine.get_rag_engine()
    
    # RAG 인덱스는 이전 스크립트에서 빌드했으므로 바로 검색
    print("1. '정보보안 관련 서비스' 검색하여 패널티 항목 노출 및 순서 검증...")
    results = engine.search("정보보안 관련 서비스 및 감사 교육", top_k=20)
    
    for idx, sol in enumerate(results, 1):
        print(f"후보 {idx}:")
        print(f"  제조사명: {sol.get('제조사명', 'N/A')}")
        print(f"  제품명: {sol.get('제품명', 'N/A')}")
        print(f"  보안영역: {sol.get('보안영역', 'N/A')}")
        print(f"  최종 유사도: {sol.get('similarity', 0.0)}")
        print(f"  패널티 적용 여부: {sol.get('penalty', False)}")
        print("-" * 40)
        
except Exception as e:
    import traceback
    traceback.print_exc()
