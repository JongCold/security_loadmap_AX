"""
RAG Engine - ChromaDB 기반 자사 보안 솔루션 벡터 DB 구축 및 검색 모듈

프로세스:
  자사 보안 솔루션 리스트.xlsx
    ➡️ Markdown 문서 세그먼트화
    ➡️ ChromaDB Vector DB 임베딩 및 저장
    ➡️ Context(참조 라이브러리) → Vector DB 매칭 솔루션
"""

import os
import sys
import re
import math
import collections
import pandas as pd
import chromadb
from chromadb.config import Settings

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOLUTION_LIST_PATH = os.path.join(BASE_DIR, "자사 보안 솔루션 리스트 (1).xlsx")
CHROMA_PERSIST_DIR = os.path.join(BASE_DIR, "chroma_db")
COLLECTION_NAME = "security_solutions"


def _safe_str(val):
    """NaN 및 None 안전 문자열 변환"""
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ""
    return str(val).strip()


def get_keyword_matching_score(query_text, metadata):
    """쿼리 텍스트의 단어들이 솔루션 정보에 얼마나 많이 포함되는지 비율을 구하고, 핵심 필드 매칭 시 보너스 점수 부여"""
    def get_words(t):
        return set(re.findall(r'[a-zA-Z0-9가-힣]+', t.lower()))
        
    query_words = get_words(query_text)
    if not query_words:
        return 0.0
        
    # 비교 대상 필드들
    area = metadata.get("보안영역", "").lower()
    sol_type = metadata.get("솔루션구분", "").lower()
    vendor = metadata.get("제조사명", "").lower()
    prod_name = metadata.get("제품명", "").lower()
    desc = metadata.get("제품명기능설명", "").lower()
    
    full_text = f"{area} {sol_type} {vendor} {prod_name} {desc}"
    
    # 1. 쿼리 단어 중 전체 텍스트에 포함된 비율 (Coverage)
    matched_words = [w for w in query_words if w in full_text]
    coverage = len(matched_words) / len(query_words)
    
    # 2. 핵심 메타필드(솔루션 구분, 제품명, 보안영역)에 매칭 시 가산점
    meta_bonus = 0.0
    for w in query_words:
        # 단어 길이가 2자 이상인 유의미한 단어 대상
        if len(w) >= 2:
            if w in sol_type or w in prod_name:
                meta_bonus += 0.35
            elif w in area:
                meta_bonus += 0.15
                
    return min(1.0, coverage + meta_bonus)


def has_ranking_penalty(metadata):
    """
    사용자 요구사항에 맞춘 RAG 솔루션 랭킹 후순위화(패널티) 판별기:
    1. 제조사명 공백/무효값
    2. 제품명 공백/무효값
    3. 보안영역/솔루션구분에 '정보보안 관련 서비스'가 포함된 경우
    4. 인력/컨설팅/교육/유지보수 등 용역 성격이 강한 솔루션
    """
    if not metadata:
        return True
        
    vendor = str(metadata.get("제조사명", "")).strip()
    prod = str(metadata.get("제품명", "")).strip()
    area = str(metadata.get("보안영역", "")).strip()
    sol_type = str(metadata.get("솔루션구분", "")).strip()
    desc = str(metadata.get("제품명기능설명", "")).strip()

    # 1. 제조사명 공백 여부
    is_vendor_empty = (not vendor or vendor.lower() in ["", "nan", "n/a", "없음", "미정"])
    
    # 2. 제품명 공백 여부
    is_prod_empty = (not prod or prod.lower() in ["", "nan", "n/a", "없음", "미정"])
    
    # 3. {정보보안 관련 서비스} 키워드 감지
    is_service_area = False
    service_keywords = ["정보보안 관련 서비스", "정보보안 관련서비스", "정보보안관련서비스", "정보보안 관련  서비스"]
    for kw in service_keywords:
        if kw in area or kw in sol_type or kw in desc:
            is_service_area = True
            break
            
    # 4. 단순 용역/컨설팅/교육/유지보수 관련 지시어
    is_consulting_service = False
    service_vendors = ["운영 및 관리", "관제서비스", "취약점 점검", "교육", "개인정보", "컨설팅", "유지보수", "보안관제", "KPMG", "삼정", "딜로이트", "삼일", "안진", "유지관리", "취약점점검"]
    for sv in service_vendors:
        if sv in vendor or sv in prod or sv in sol_type or sv in area:
            is_consulting_service = True
            break

    return (is_vendor_empty or is_prod_empty or is_service_area or is_consulting_service)




def _build_markdown_segment(row):
    """자사 솔루션 1건을 구조화된 Markdown 세그먼트로 변환
    
    변환 예시:
    # [솔루션 정보] NGFW A (차세대 방화벽)
    - **보안영역**: 네트워크 보안
    - **솔루션 구분**: NGFW A(차세대 방화벽)
    - **제조사**: Fortinet
    - **제품명**: FG 시리즈
    - **주요 기능**: 'Fortinet의 FG 시리즈'는 ...
    """
    area = _safe_str(row.get("보안영역", ""))
    sol_type = _safe_str(row.get("솔루션 구분", ""))
    vendor = _safe_str(row.get("제조사명", ""))
    prod_name = _safe_str(row.get("제품명", ""))
    desc = _safe_str(row.get("제품명 기능 설명", ""))

    # 제조사명과 제품명이 모두 비어있으면 유효하지 않은 행
    if not vendor and not prod_name:
        return None, None

    # 도입 불필요/유보/제외 키워드 검사 및 사전 필터링
    exclude_keywords = [
        "제외함", "보류함", "가능성 낮음", "낮은 가능성", 
        "도입을 권장하지", "적용 가능성 낮음", "레퍼런스 적음"
    ]
    for kw in exclude_keywords:
        if kw in prod_name or kw in desc or kw in sol_type:
            # RAG에 임베딩하지 않고 버림
            return None, None

    # [수정] 단순 용역/컨설팅/제조사명 공백 등의 조건은 인덱싱 시점에 차단하지 않고,
    # RAG 검색 및 랭킹 정렬 단계에서 가장 후순위(최하위)로 밀려나도록 후처리 패널티 구조로 우회시킵니다.
    # (단, 제조사명과 제품명 둘 다 유실된 무효 행은 RAG 용량 관리를 위해 계속 스킵)

    # Markdown 세그먼트 구성
    title = prod_name if prod_name else sol_type
    md = f"# [솔루션 정보] {title}\n"
    md += f"- **보안영역**: {area}\n"
    md += f"- **솔루션 구분**: {sol_type}\n"
    md += f"- **제조사명**: {vendor}\n"
    md += f"- **제품명**: {prod_name}\n"
    md += f"- **주요 기능 및 특징**: {desc}\n"

    # 메타데이터
    metadata = {
        "보안영역": area,
        "솔루션구분": sol_type,
        "제조사명": vendor,
        "제품명": prod_name,
        "제품명기능설명": desc
    }

    return md, metadata


class SecuritySolutionRAG:
    """ChromaDB 기반 자사 보안 솔루션 RAG 엔진
    
    기능:
    1. 자사 보안 솔루션 리스트 엑셀 → Markdown 세그먼트 변환
    2. ChromaDB에 벡터 임베딩 및 영구 저장
    3. 결함 항목 Query → 유사도 기반 Top-K 솔루션 검색
    """

    def __init__(self, persist_dir=CHROMA_PERSIST_DIR, collection_name=COLLECTION_NAME):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self._client = None
        self._collection = None
        self._initialized = False

    def _get_client(self):
        """ChromaDB 영구 클라이언트 싱글턴"""
        if self._client is None:
            os.makedirs(self.persist_dir, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
        return self._client

    def _get_collection(self):
        """ChromaDB 컬렉션 싱글턴"""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    def build_index(self, excel_path=SOLUTION_LIST_PATH, force_rebuild=False):
        """자사 보안 솔루션 엑셀 파일을 읽어 ChromaDB 벡터 인덱스 구축
        
        Args:
            excel_path: 자사 보안 솔루션 리스트 엑셀 파일 경로
            force_rebuild: True이면 기존 인덱스를 삭제하고 재구축
        
        Returns:
            int: 인덱싱된 솔루션 문서 수
        """
        if not os.path.exists(excel_path):
            print(f"[RAG] 경고: 자사 솔루션 엑셀 파일 없음: {excel_path}", flush=True)
            return 0

        collection = self._get_collection()

        # 이미 데이터가 존재하고 force_rebuild가 아니면 스킵
        existing_count = collection.count()
        if existing_count > 0 and not force_rebuild:
            print(f"[RAG] ChromaDB 인덱스 이미 구축됨 (문서 수: {existing_count}건). 스킵합니다.", flush=True)
            self._initialized = True
            return existing_count

        # force_rebuild인 경우 기존 컬렉션 삭제 후 재생성
        if force_rebuild and existing_count > 0:
            print(f"[RAG] 기존 인덱스 삭제 후 재구축 시작...", flush=True)
            client = self._get_client()
            client.delete_collection(self.collection_name)
            self._collection = None
            collection = self._get_collection()

        print(f"[RAG] 자사 솔루션 엑셀 로딩 중: {excel_path}", flush=True)
        df = pd.read_excel(excel_path, sheet_name="Sheet1")
        df.columns = [c.strip().strip("'").strip('"') for c in df.columns]

        documents = []
        metadatas = []
        ids = []

        for idx, row in df.iterrows():
            md_segment, metadata = _build_markdown_segment(row)
            if md_segment is None:
                continue

            doc_id = f"sol_{idx:04d}"
            documents.append(md_segment)
            metadatas.append(metadata)
            ids.append(doc_id)

        if not documents:
            print("[RAG] 경고: 유효한 솔루션 문서가 0건입니다.", flush=True)
            return 0

        # ChromaDB에 배치 업서트 (ChromaDB 내장 임베딩 모델 자동 사용)
        # 100건씩 분할하여 업서트 (대용량 대비)
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_metas = metadatas[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            collection.upsert(
                documents=batch_docs,
                metadatas=batch_metas,
                ids=batch_ids
            )

        total = collection.count()
        print(f"[RAG] ✅ ChromaDB 벡터 인덱스 구축 완료! 총 {total}건 임베딩 완료.", flush=True)
        self._initialized = True
        return total

    def search(self, query_text, top_k=3):
        """결함 항목 텍스트로 자사 솔루션 하이브리드 유사도 검색
        
        ChromaDB 벡터 유사도와 단어 빈도 기반 코사인 유사도를 결합하여 한글 검색의 정확성을 극대화합니다.
        
        Args:
            query_text: 검색 쿼리 (결함 항목명 + 세부점검내용 + 개선방안 등)
            top_k: 반환할 상위 매칭 솔루션 수 (기본 3)
        
        Returns:
            list[dict]: 매칭된 솔루션 메타데이터 + 최종 유사도 점수 리스트
        """
        if not self._initialized:
            self.build_index()

        collection = self._get_collection()

        if collection.count() == 0:
            print("[RAG] 경고: 벡터 DB가 비어 있습니다. 검색 불가.", flush=True)
            return []

        # 1단계: 전체 자사 솔루션을 대상으로 ChromaDB에서 1차 후보 추출 (후보 누락 방지)
        candidates_to_fetch = collection.count()
        results = collection.query(
            query_texts=[query_text],
            n_results=candidates_to_fetch,
            include=["documents", "metadatas", "distances"]
        )

        matched = []
        if results and results.get("ids") and len(results["ids"]) > 0:
            for i, doc_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results.get("distances") else 1.0
                chroma_sim = 1.0 - distance  # 코사인 거리 → 유사도 변환
                
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                document = results["documents"][0][i] if results.get("documents") else ""
                
                # 2단계: 한국어 키워드 매칭 성능 보완을 위해 쿼리 토큰 매칭률 및 핵심 필드 보너스 점수 계산
                keyword_sim = get_keyword_matching_score(query_text, metadata)
                
                # 하이브리드 점수 = 0.3 * 벡터유사도 + 0.7 * 키워드유사도
                final_sim = (0.3 * chroma_sim) + (0.7 * keyword_sim)

                # 패널티를 받은 애들은 최종 유사도 점수를 대폭 감산하여 자동 N/A 필터에 더 잘 걸리게 합니다.
                penalty_applied = has_ranking_penalty(metadata)
                if penalty_applied:
                    final_sim = max(0.0, final_sim - 0.40)

                matched.append({
                    "id": doc_id,
                    "similarity": round(final_sim, 4),
                    "chroma_similarity": round(chroma_sim, 4),
                    "keyword_similarity": round(keyword_sim, 4),
                    "document": document,
                    "보안영역": metadata.get("보안영역", ""),
                    "솔루션구분": metadata.get("솔루션구분", ""),
                    "제조사명": metadata.get("제조사명", ""),
                    "제품명": metadata.get("제품명", ""),
                    "제품명기능설명": metadata.get("제품명기능설명", ""),
                    "penalty": penalty_applied
                })

        # 3단계: 하이브리드 최종 유사도 기준으로 내림차순 재정렬 (Re-ranking)
        # 패널티가 적용되지 않은(penalty=False) 녀석들을 0순위로 우선 배치하고, 동일 등급 내에서는 유사도 점수가 높은 것 순으로 배치합니다.
        matched.sort(key=lambda x: (x["penalty"], -x["similarity"]))
        return matched[:top_k]

    def find_best_solution(self, item, similarity_threshold=0.25):
        """결함 항목에 대해 최적의 자사 솔루션 1건 매핑
        
        Args:
            item: 결함 항목 dict (항목명, 세부점검내용, 운영현황_증적, 개선방안)
            similarity_threshold: 유사도 최소 임계값 (이 값 미만이면 N/A 처리)
        
        Returns:
            tuple: (best_solution_dict or None, similarity_score)
        """
        # 쿼리 구성: 항목명 + 세부점검내용 + 개선방안을 조합
        query_parts = [
            item.get("항목명", ""),
            item.get("세부점검내용", ""),
            item.get("개선방안", ""),
            item.get("운영현황_증적", "")
        ]
        query_text = " ".join([p for p in query_parts if p])

        if not query_text.strip():
            return None, 0.0

        # Top-3 검색 후 최상위 매칭 반환
        results = self.search(query_text, top_k=3)

        if not results:
            return None, 0.0

        best = results[0]

        # 제조사명이 공백이거나 제품명이 공백이거나 패널티가 적용된 항목인 경우 차선책 탐색
        def is_invalid_or_penalized(x):
            v = str(x.get("제조사명", "")).strip()
            p = str(x.get("제품명", "")).strip()
            is_empty = (not v or v.lower() in ["", "nan", "n/a", "없음", "미정"]) or \
                       (not p or p.lower() in ["", "nan", "n/a", "없음", "미정"])
            return is_empty or x.get("penalty", False)

        if is_invalid_or_penalized(best):
            # 차선 결과 탐색 (패널티 없고 온전한 제품 우선)
            for alt in results[1:]:
                if not is_invalid_or_penalized(alt):
                    best = alt
                    break
            else:
                # 차선책마저 모두 무효/패널티 대상이라면, 가장 점수가 높은 1순위 후보를 그대로 유지하되 
                # (결국 임계치 검사에서 N/A 처리될 확률이 높음)
                pass

        similarity = best.get("similarity", 0.0)

        if similarity < similarity_threshold:
            print(f"[RAG] 유사도 {similarity:.4f} < 임계값 {similarity_threshold} → 솔루션 매핑 N/A 처리", flush=True)
            return None, similarity

        return best, similarity

    def get_rag_context_markdown(self, item, top_k=3):
        """결함 항목에 대한 RAG 컨텍스트를 Markdown 형태로 생성
        
        LLM 프롬프트에 주입할 Context(참조 라이브러리) 문서를 구성합니다.
        
        Args:
            item: 결함 항목 dict
            top_k: 참조할 솔루션 수
        
        Returns:
            str: Markdown 형식의 RAG 컨텍스트 문자열
        """
        query_parts = [
            item.get("항목명", ""),
            item.get("세부점검내용", ""),
            item.get("개선방안", "")
        ]
        query_text = " ".join([p for p in query_parts if p])

        results = self.search(query_text, top_k=top_k)

        if not results:
            return "[자사 솔루션 라이브러리: 검색 결과 없음]"

        context_md = "[자사 솔루션 라이브러리 (RAG 검색 결과)]\n\n"
        for i, sol in enumerate(results, 1):
            context_md += f"--- 후보 {i} (유사도: {sol['similarity']:.2%}) ---\n"
            context_md += sol.get("document", "정보 없음")
            context_md += "\n\n"

        return context_md

    def clear_index(self):
        """ChromaDB 컬렉션을 초기화하여 벡터 DB 데이터를 완전히 삭제합니다."""
        client = self._get_client()
        try:
            # 컬렉션 삭제
            client.delete_collection(self.collection_name)
            self._collection = None
            self._initialized = False
            print("[RAG] ✅ ChromaDB 벡터 인덱스가 성공적으로 초기화(삭제)되었습니다.", flush=True)
            return True
        except Exception as e:
            print(f"[RAG] 컬렉션 삭제 오류: {e}", flush=True)
            return False


# 글로벌 싱글턴 인스턴스
_rag_instance = None

def get_rag_engine():
    """RAG 엔진 싱글턴 인스턴스 반환"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = SecuritySolutionRAG()
    return _rag_instance

def initialize_rag(force_rebuild=False):
    """RAG 시스템 초기화 (서버 시작 시 1회 호출)"""
    engine = get_rag_engine()
    count = engine.build_index(force_rebuild=force_rebuild)
    print(f"[RAG] 시스템 초기화 완료. 인덱싱 문서 수: {count}건", flush=True)
    return engine
