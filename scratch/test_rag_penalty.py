import os
import sys

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rag_engine

sys.stdout.reconfigure(encoding='utf-8')

try:
    print("1. RAG 인덱스 강제 재구축 시작 (force_rebuild=True)...")
    engine = rag_engine.get_rag_engine()
    count = engine.build_index(force_rebuild=True)
    print(f"✅ RAG 인덱스 재구축 완료! 총 {count}건 임베딩 완료.")
    
    print("\n2. RAG 검색 테스트 및 패널티 랭킹 검증...")
    # '방화벽' 및 '컨설팅' 관련 결함 쿼리 시뮬레이션
    query_text = "방화벽 및 보안 통제 정책 수립을 위한 정보보안 감사를 진행해야 함."
    print(f"검색 쿼리: '{query_text}'")
    
    results = engine.search(query_text, top_k=5)
    print(f"총 검색 결과 수: {len(results)}")
    
    print("\n--- 상위 검색 결과 명세 (정렬 순서) ---")
    for idx, sol in enumerate(results, 1):
        print(f"후보 {idx}:")
        print(f"  제조사명: {sol.get('제조사명', 'N/A')}")
        print(f"  제품명: {sol.get('제품명', 'N/A')}")
        print(f"  보안영역: {sol.get('보안영역', 'N/A')}")
        print(f"  솔루션구분: {sol.get('솔루션구분', 'N/A')}")
        print(f"  최종 유사도: {sol.get('similarity', 0.0)}")
        print(f"  패널티 적용 여부: {sol.get('penalty', False)}")
        print("-" * 50)
        
    print("\n3. find_best_solution 차선책 매핑 테스트...")
    # 제조사가 비어 있거나 용역이 다수 매칭될 만한 지문으로 시뮬레이션
    item = {
        "항목명": "보안 통제 관리",
        "세부점검내용": "사내 정보보호 정책 및 정보보안 규정에 따라 감사를 시행해야 함.",
        "개선방안": "전문 인력에 의한 정보보호 컨설팅 서비스를 도입해 감사를 수행할 것.",
        "운영현황_증적": "관련 감사를 주기적으로 수행하지 못하고 있음."
    }
    
    best, score = engine.find_best_solution(item, similarity_threshold=0.15)
    if best:
        print("✅ 최적 솔루션 매핑 성공!")
        print(f"  제조사명: {best.get('제조사명')}")
        print(f"  제품명: {best.get('제품명')}")
        print(f"  유사도 점수: {score}")
    else:
        print("⚠️ 최적 솔루션 매핑 결과 없음 (N/A 수렴 완료)")
        
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"❌ 에러 발생: {e}")
