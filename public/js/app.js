/**
 * Security Roadmap Agent - Vercel 배포용 프론트엔드 스크립트
 * 
 * 주요 변경점:
 * 1. API_BASE_URL 동적 설정 (로컬 / 원격 백엔드 전환 가능)
 * 2. 데모 모드 (DEMO_MODE): 백엔드 연결 불가 시 목업 데이터로 UI 시연
 * 3. Flask 경로 의존성 제거 (순수 정적 사이트 호환)
 */

// ====================================================================
// 환경 설정 (Vercel 배포 시 이 값을 변경)
// ====================================================================
const CONFIG = {
    // 백엔드 API 서버 URL (로컬 Flask 서버 구동 시 주소)
    // Vercel 배포 시에는 백엔드가 없으므로, 빈 문자열로 두면 데모 모드가 자동 활성화됩니다.
    API_BASE_URL: '',
    
    // 데모 모드 강제 활성화 (true: 항상 데모 모드, false: API 연결 시도 후 실패하면 데모 모드)
    FORCE_DEMO_MODE: false,

    // 백엔드 연결 확인 타임아웃 (ms)
    HEALTH_CHECK_TIMEOUT: 3000
};

// ====================================================================
// 데모 모드 목업 데이터 (보안 민감 정보 마스킹 처리)
// ====================================================================
const DEMO_DATA = {
    company: 'DEMO 기업',
    items: [
        {
            row_idx: 1,
            "항목명": "접근통제 정책",
            "세부점검내용": "정보시스템에 대한 접근 권한 관리 정책 수립 여부",
            "운영현황_증적": "현재 접근통제 정책이 문서화되어 있지 않으며, 시스템별 권한 관리가 개별적으로 운영되고 있음. 퇴직자 계정 회수 절차가 미흡하여 일부 비활성 계정이 존재함.",
            "개선방안": "통합 접근통제 정책을 수립하고, 계정 라이프사이클 관리 체계를 도입하여 입사/퇴사/이동 시 권한이 자동으로 변경되도록 IAM 솔루션 도입이 필요함.",
            "보안영역": "접근통제",
            "과제명": "통합 계정 및 접근 관리 체계 구축",
            "법적요구": "개인정보보호법 제29조",
            "시급성": 5,
            "위험도": 4,
            "예상예산": "5,000만원 ~ 8,000만원",
            "로드맵연도": "2026년",
            "비고": "",
            "추천솔루션": "SafeNet Trusted Access",
            "제조사": "Thales"
        },
        {
            row_idx: 2,
            "항목명": "네트워크 보안",
            "세부점검내용": "방화벽 정책 관리 및 침입 탐지/방지 시스템 운영 여부",
            "운영현황_증적": "기존 방화벽 장비의 노후화로 최신 위협 대응 능력이 부족함. IPS/IDS 장비가 미도입되어 외부 침입 탐지 기능이 없는 상태.",
            "개선방안": "차세대 방화벽(NGFW)으로 교체하고, 네트워크 IPS 장비를 도입하여 실시간 침입 탐지 및 차단 체계를 구축해야 함.",
            "보안영역": "네트워크 보안",
            "과제명": "차세대 방화벽 및 IPS 도입",
            "법적요구": "정보통신망법 제45조",
            "시급성": 5,
            "위험도": 5,
            "예상예산": "1억원 ~ 1.5억원",
            "로드맵연도": "2026년",
            "비고": "",
            "추천솔루션": "TrusGuard",
            "제조사": "AhnLab"
        },
        {
            row_idx: 3,
            "항목명": "데이터 암호화",
            "세부점검내용": "개인정보 및 민감 데이터의 암호화 조치 이행 여부",
            "운영현황_증적": "DB 내 개인정보(주민번호, 카드번호 등)에 대한 암호화가 일부 누락되어 있으며, 암호화 키 관리 정책이 부재함.",
            "개선방안": "DB 암호화 솔루션을 도입하여 개인정보 필드를 전체 암호화하고, 별도의 키 관리 서버(KMS)를 구축하여 암호화 키 생명주기를 체계적으로 관리.",
            "보안영역": "데이터 보호",
            "과제명": "DB 암호화 및 키 관리 체계 구축",
            "법적요구": "개인정보보호법 제24조의2",
            "시급성": 4,
            "위험도": 4,
            "예상예산": "3,000만원 ~ 5,000만원",
            "로드맵연도": "2026년",
            "비고": "",
            "추천솔루션": "D'Amo",
            "제조사": "펜타시큐리티"
        },
        {
            row_idx: 4,
            "항목명": "보안 관제",
            "세부점검내용": "보안 이벤트 통합 모니터링 및 관제 체계 운영 여부",
            "운영현황_증적": "현재 보안 장비별 개별 로그 관리만 수행하고 있으며, 통합 보안 관제 체계가 부재하여 이상 징후 실시간 탐지가 불가능한 상태.",
            "개선방안": "SIEM 솔루션을 도입하여 전사 보안 로그를 통합 수집·분석하고, 24×7 보안 관제 체계를 구축하여 이상 징후를 실시간으로 탐지·대응.",
            "보안영역": "보안 관제",
            "과제명": "SIEM 기반 통합 보안 관제 구축",
            "법적요구": "N/A",
            "시급성": 3,
            "위험도": 3,
            "예상예산": "8,000만원 ~ 1.2억원",
            "로드맵연도": "2027년",
            "비고": "",
            "추천솔루션": "ArcSight",
            "제조사": "Micro Focus"
        },
        {
            row_idx: 5,
            "항목명": "엔드포인트 보안",
            "세부점검내용": "업무용 PC 및 모바일 단말의 악성코드 방지 및 매체 제어 여부",
            "운영현황_증적": "사내 PC에 백신 소프트웨어가 설치되어 있으나, 패턴 업데이트 주기가 불규칙하며, USB 등 이동식 매체에 대한 통제가 이루어지지 않고 있음.",
            "개선방안": "EDR(Endpoint Detection & Response) 솔루션을 도입하여 지능형 위협에 대한 실시간 탐지·대응 체계를 구축하고, 매체 제어(DLP) 기능도 병행 적용.",
            "보안영역": "엔드포인트 보안",
            "과제명": "EDR 및 매체 제어 솔루션 도입",
            "법적요구": "N/A",
            "시급성": 3,
            "위험도": 3,
            "예상예산": "2,000만원 ~ 4,000만원",
            "로드맵연도": "2027년",
            "비고": "",
            "추천솔루션": "V3 Endpoint Security",
            "제조사": "AhnLab"
        },
        {
            row_idx: 6,
            "항목명": "취약점 관리",
            "세부점검내용": "주기적 보안 취약점 점검 및 패치 관리 체계 운영 여부",
            "운영현황_증적": "서버 및 네트워크 장비에 대한 취약점 점검이 연 1회만 수행되고 있으며, 점검 결과에 대한 조치 이력 관리가 미비함.",
            "개선방안": "취약점 스캐너를 도입하여 분기별 자동 점검을 수행하고, 패치 관리 시스템과 연동하여 조치 추적 관리 체계를 마련.",
            "보안영역": "취약점 관리",
            "과제명": "자동화 취약점 스캐닝 및 패치 관리",
            "법적요구": "N/A",
            "시급성": 2,
            "위험도": 2,
            "예상예산": "1,500만원 ~ 3,000만원",
            "로드맵연도": "2028년",
            "비고": "",
            "추천솔루션": "Nessus Professional",
            "제조사": "Tenable"
        }
    ]
};

// ====================================================================
// 전역 상태 변수
// ====================================================================
let isDemoMode = false;
let uploadedData = null;
let mappedResults = null;
let envFilepath = null;
let assetFilepath = null;

// ====================================================================
// 초기화 로직
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 백엔드 연결 확인 → 데모 모드 결정
    isDemoMode = await checkDemoMode();
    
    if (isDemoMode) {
        activateDemoMode();
    }

    // 2. DOM 요소 바인딩
    initializeUI();
});

/**
 * 백엔드 API 서버 연결 여부를 확인하여 데모 모드 사용 여부를 결정
 */
async function checkDemoMode() {
    if (CONFIG.FORCE_DEMO_MODE) return true;
    if (!CONFIG.API_BASE_URL) return true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.HEALTH_CHECK_TIMEOUT);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/rag/status`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        return !response.ok;
    } catch (e) {
        console.warn('[시스템] 백엔드 연결 실패, 데모 모드로 전환합니다.', e.message);
        return true;
    }
}

/**
 * 데모 모드를 활성화하고 UI에 표시
 */
function activateDemoMode() {
    const banner = document.getElementById('demo-mode-banner');
    if (banner) {
        banner.style.display = 'inline-flex';
    }
    console.log('[시스템] 🧪 데모 모드 활성화됨 — 목업 데이터로 UI 시연 중');
}

/**
 * API 호출 래퍼 함수 (데모 모드 시 목업 반환)
 */
function apiUrl(path) {
    return `${CONFIG.API_BASE_URL}${path}`;
}

// ====================================================================
// UI 초기화 및 이벤트 바인딩
// ====================================================================
function initializeUI() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');

    const dropzoneEnv = document.getElementById('dropzone-env');
    const fileInputEnv = document.getElementById('file-input-env');
    const fileInfoEnv = document.getElementById('file-info-env');

    const dropzoneAsset = document.getElementById('dropzone-asset');
    const fileInputAsset = document.getElementById('file-input-asset');
    const fileInfoAsset = document.getElementById('file-info-asset');

    const uploadActions = document.getElementById('upload-actions');
    const btnMapStart = document.getElementById('btn-map-start');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const progressBar = document.getElementById('progress-bar');
    const resultCard = document.getElementById('result-card');
    const companyNameBadge = document.getElementById('company-name');
    const resultTbody = document.getElementById('result-tbody');
    const btnExport = document.getElementById('btn-export');
    const modelSelect = document.getElementById('model-select');

    // 1. 드롭존 클릭 시 파일 브라우저 열기
    dropzone.addEventListener('click', () => fileInput.click());
    if (dropzoneEnv) dropzoneEnv.addEventListener('click', () => fileInputEnv.click());
    if (dropzoneAsset) dropzoneAsset.addEventListener('click', () => fileInputAsset.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    if (fileInputEnv) {
        fileInputEnv.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleEnvFileUpload(e.target.files[0]);
            }
        });
    }
    if (fileInputAsset) {
        fileInputAsset.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleAssetFileUpload(e.target.files[0]);
            }
        });
    }

    // 2. 드롭존 드래그 앤 드롭 바인딩
    function bindDragAndDrop(element, uploadHandler) {
        if (!element) return;
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('dragover');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                uploadHandler(e.dataTransfer.files[0]);
            }
        });
    }

    bindDragAndDrop(dropzone, handleFileUpload);
    bindDragAndDrop(dropzoneEnv, handleEnvFileUpload);
    bindDragAndDrop(dropzoneAsset, handleAssetFileUpload);

    // 3. 비동기 엑셀 업로드 처리 (상세체크리스트)
    function handleFileUpload(file) {
        if (!file.name.endsWith('.xlsx')) {
            alert('엑셀 파일(.xlsx) 형식만 업로드 가능합니다.');
            return;
        }

        if (isDemoMode) {
            // 데모 모드: 목업 데이터로 즉시 렌더링
            fileInfo.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} (데모 모드 — 목업 데이터 로드됨)`;
            uploadedData = { company: DEMO_DATA.company, items: DEMO_DATA.items };
            companyNameBadge.textContent = DEMO_DATA.company;
            uploadActions.style.display = 'block';
            mappedResults = DEMO_DATA.items;
            renderResultTable(DEMO_DATA.items);
            resultCard.style.display = 'block';
            return;
        }

        fileInput.disabled = true;
        fileInfo.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 파일 분석 중...`;
        
        const formData = new FormData();
        formData.append('file', file);

        fetch(apiUrl('/api/upload'), {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            fileInput.disabled = false;
            if (data.status === 'success') {
                uploadedData = data;
                fileInfo.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} 업로드 성공 (결함 건수: ${data.items.length}건 감지)`;
                companyNameBadge.textContent = data.company;
                uploadActions.style.display = 'block';
                
                mappedResults = data.items;
                renderResultTable(data.items);
                resultCard.style.display = 'block';
            } else {
                fileInfo.innerHTML = ``;
                alert(data.message || '파일 업로드 실패');
            }
        })
        .catch(err => {
            fileInput.disabled = false;
            console.error(err);
            fileInfo.innerHTML = ``;
            alert('서버 통신 실패. 백엔드 서버가 구동 중인지 확인해주세요.');
        });
    }

    // 3-2. 비동기 사전환경조사서 업로드 처리
    function handleEnvFileUpload(file) {
        if (!file.name.endsWith('.xlsx')) {
            alert('엑셀 파일(.xlsx) 형식만 업로드 가능합니다.');
            return;
        }

        if (isDemoMode) {
            fileInfoEnv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} (데모 모드)`;
            return;
        }

        fileInputEnv.disabled = true;
        fileInfoEnv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 업로드 중...`;
        
        const formData = new FormData();
        formData.append('file', file);

        fetch(apiUrl('/api/upload_env'), {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            fileInputEnv.disabled = false;
            if (data.status === 'success') {
                envFilepath = data.filepath;
                fileInfoEnv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} 업로드 완료`;
                if (data.company && data.company !== "고객사") {
                    companyNameBadge.textContent = data.company;
                    if (uploadedData) {
                        uploadedData.company = data.company;
                    }
                }
            } else {
                fileInfoEnv.innerHTML = ``;
                alert(data.message || '사전환경조사서 업로드 실패');
            }
        })
        .catch(err => {
            fileInputEnv.disabled = false;
            console.error(err);
            fileInfoEnv.innerHTML = ``;
            alert('서버 통신 실패');
        });
    }

    // 3-3. 비동기 자산목록 업로드 처리
    function handleAssetFileUpload(file) {
        if (!file.name.endsWith('.xlsx')) {
            alert('엑셀 파일(.xlsx) 형식만 업로드 가능합니다.');
            return;
        }

        if (isDemoMode) {
            fileInfoAsset.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} (데모 모드)`;
            return;
        }

        fileInputAsset.disabled = true;
        fileInfoAsset.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 업로드 중...`;
        
        const formData = new FormData();
        formData.append('file', file);

        fetch(apiUrl('/api/upload_asset'), {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            fileInputAsset.disabled = false;
            if (data.status === 'success') {
                assetFilepath = data.filepath;
                fileInfoAsset.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${file.name} 업로드 완료`;
            } else {
                fileInfoAsset.innerHTML = ``;
                alert(data.message || '자산목록 업로드 실패');
            }
        })
        .catch(err => {
            fileInputAsset.disabled = false;
            console.error(err);
            fileInfoAsset.innerHTML = ``;
            alert('서버 통신 실패');
        });
    }

    // 4. AI 매핑 시작
    btnMapStart.addEventListener('click', () => {
        if (!uploadedData || !uploadedData.items || uploadedData.items.length === 0) {
            alert('매핑할 데이터가 없습니다.');
            return;
        }

        if (isDemoMode) {
            // 데모 모드: 시뮬레이션 로딩 후 목업 결과 표시
            btnMapStart.disabled = true;
            btnMapStart.style.opacity = '0.6';
            btnMapStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 데모 분석 처리 중...`;
            loadingOverlay.style.display = 'block';
            progressBar.style.width = '10%';
            if (loadingText) {
                loadingText.innerHTML = `<strong>[데모 모드]</strong> AI 매핑 시뮬레이션 진행 중...`;
            }

            let progress = 10;
            const interval = setInterval(() => {
                if (progress < 95) {
                    progress += Math.floor(Math.random() * 20) + 10;
                    if (progress > 95) progress = 95;
                    progressBar.style.width = `${progress}%`;
                }
            }, 300);

            setTimeout(() => {
                clearInterval(interval);
                progressBar.style.width = '100%';
                
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                    btnMapStart.disabled = false;
                    btnMapStart.style.opacity = '1';
                    btnMapStart.innerHTML = `<i class="fa-solid fa-microchip"></i> AI 매핑 및 스케줄링 기동`;

                    mappedResults = DEMO_DATA.items;
                    renderResultTable(DEMO_DATA.items);
                    resultCard.style.display = 'block';
                    resultCard.scrollIntoView({ behavior: 'smooth' });
                }, 400);
            }, 2000);
            return;
        }

        // 실제 모드
        btnMapStart.disabled = true;
        btnMapStart.style.opacity = '0.6';
        btnMapStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 분석 처리 중...`;

        const selectedModel = modelSelect ? modelSelect.value : 'gemma2:2b';
        if (loadingText) {
            loadingText.innerHTML = `선택된 LLM 모델 <strong>[${selectedModel}]</strong> 기반 AI 분석 및 RAG 매핑 실행 중...`;
        }

        loadingOverlay.style.display = 'block';
        progressBar.style.width = '10%';

        let progress = 10;
        const interval = setInterval(() => {
            if (progress < 90) {
                progress += Math.floor(Math.random() * 15) + 5;
                if (progress > 90) progress = 90;
                progressBar.style.width = `${progress}%`;
            }
        }, 1200);

        fetch(apiUrl('/api/map'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                items: uploadedData.items,
                model: selectedModel
            })
        })
        .then(res => res.json())
        .then(data => {
            clearInterval(interval);
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                btnMapStart.disabled = false;
                btnMapStart.style.opacity = '1';
                btnMapStart.innerHTML = `<i class="fa-solid fa-microchip"></i> AI 매핑 및 스케줄링 기동`;

                if (data.status === 'success') {
                    mappedResults = data.results;
                    renderResultTable(data.results);
                    resultCard.style.display = 'block';
                    resultCard.scrollIntoView({ behavior: 'smooth' });
                } else {
                    alert(data.message || '매핑 실행 오류');
                }
            }, 500);
        })
        .catch(err => {
            clearInterval(interval);
            loadingOverlay.style.display = 'none';
            btnMapStart.disabled = false;
            btnMapStart.style.opacity = '1';
            btnMapStart.innerHTML = `<i class="fa-solid fa-microchip"></i> AI 매핑 및 스케줄링 기동`;
            console.error(err);
            alert('매핑 통신 실패');
        });
    });

    // 5. 결과 테이블 동적 바인딩
    function renderResultTable(results) {
        resultTbody.innerHTML = '';
        
        results.forEach((res, index) => {
            const tr = document.createElement('tr');
            
            const urgencyVal = parseInt(res.시급성, 10) || 3;
            const urgencyClass = urgencyVal >= 4 ? 'badge-red' : 'badge-blue';
            
            const riskVal = parseInt(res.위험도, 10) || 3;
            let riskOptions = '';
            for (let i = 1; i <= 5; i++) {
                riskOptions += `<option value="${i}" ${riskVal === i ? 'selected' : ''}>${i}단계</option>`;
            }
            
            const yearVal = String(res.로드맵연도 || '').trim();
            const yearOptionsList = ['2026년', '2027년', '2028년', '2029년', '2030년', 'N/A'];
            let yearOptions = '';
            yearOptionsList.forEach(y => {
                const isSelected = yearVal.includes(y.replace('년', '')) || yearVal === y;
                yearOptions += `<option value="${y}" ${isSelected ? 'selected' : ''}>${y}</option>`;
            });

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="table-badge badge-blue">${res.항목명}</span></td>
                <td class="clickable-cell" style="max-width: 320px; white-space: normal; line-height:1.4;" data-idx="${index}">
                    <div style="font-size:0.8rem; color:#888; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">[현황] ${res.운영현황_증적}</div>
                    <div style="color:var(--accent-red); margin-top:4px; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">[개선] ${res.개선방안}</div>
                </td>
                <td style="font-weight:600; color:var(--accent-blue);">${res.추천솔루션 !== 'N/A' ? `${res.추천솔루션} (${res.제조사})` : 'N/A'}</td>
                <td><span class="table-badge badge-purple">${res.법적요구}</span></td>
                <td><span class="table-badge ${urgencyClass}">${res.시급성}</span></td>
                <td>
                    <select class="edit-select select-risk" style="width: 80px;" data-idx="${index}">
                        ${riskOptions}
                    </select>
                </td>
                <td>
                    <input type="text" class="edit-input input-budget" style="width: 110px;" value="${res.예상예산 || ''}" data-idx="${index}">
                </td>
                <td>
                    <select class="edit-select select-year" style="width: 90px;" data-idx="${index}">
                        ${yearOptions}
                    </select>
                </td>
                <td>
                    <button class="btn-inline-save btn-save-row" data-idx="${index}">
                        <i class="fa-solid fa-check"></i> 입력 완료
                    </button>
                </td>
            `;
            
            resultTbody.appendChild(tr);
        });

        // 팝업 모달 이벤트 연결
        const clickableCells = resultTbody.querySelectorAll('.clickable-cell');
        clickableCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const idx = parseInt(cell.getAttribute('data-idx'), 10);
                const data = results[idx];
                openTextModal(data);
            });
        });

        // 행별 저장 이벤트 연결 및 실시간 메모리 동기화
        const saveButtons = resultTbody.querySelectorAll('.btn-save-row');
        saveButtons.forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const rowSelectRisk = resultTbody.querySelector(`.select-risk[data-idx="${idx}"]`);
            const rowInputBudget = resultTbody.querySelector(`.input-budget[data-idx="${idx}"]`);
            const rowSelectYear = resultTbody.querySelector(`.select-year[data-idx="${idx}"]`);

            if (rowSelectRisk) {
                rowSelectRisk.addEventListener('change', () => {
                    mappedResults[idx].위험도 = parseInt(rowSelectRisk.value, 10);
                });
            }
            if (rowInputBudget) {
                rowInputBudget.addEventListener('input', () => {
                    mappedResults[idx].예상예산 = rowInputBudget.value.trim();
                });
            }
            if (rowSelectYear) {
                rowSelectYear.addEventListener('change', () => {
                    mappedResults[idx].로드맵연도 = rowSelectYear.value;
                });
            }

            btn.addEventListener('click', () => {
                if (rowSelectRisk) mappedResults[idx].위험도 = parseInt(rowSelectRisk.value, 10);
                if (rowInputBudget) mappedResults[idx].예상예산 = rowInputBudget.value.trim();
                if (rowSelectYear) mappedResults[idx].로드맵연도 = rowSelectYear.value;

                btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> 적용됨`;
                btn.style.background = 'linear-gradient(135deg, var(--accent-green), #00e676)';
                btn.style.color = '#0b0e1b';
                btn.classList.add('applied');
            });
        });
    }

    // 모달 팝업 컨트롤러
    const textModal = document.getElementById('text-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    
    function openTextModal(data) {
        if (!textModal) return;
        document.getElementById('modal-item-name').textContent = data.항목명 || 'N/A';
        document.getElementById('modal-current-status').textContent = data.운영현황_증적 || 'N/A';
        document.getElementById('modal-improvement').textContent = data.개선방안 || 'N/A';
        textModal.classList.add('active');
    }

    if (modalCloseBtn && textModal) {
        modalCloseBtn.addEventListener('click', () => {
            textModal.classList.remove('active');
        });
        textModal.addEventListener('click', (e) => {
            if (e.target === textModal) {
                textModal.classList.remove('active');
            }
        });
    }

    // 6. 결과 엑셀 추출 (다운로드)
    btnExport.addEventListener('click', () => {
        if (!mappedResults) {
            alert('내보낼 매핑 데이터가 존재하지 않습니다.');
            return;
        }

        if (isDemoMode) {
            alert('📋 데모 모드에서는 엑셀 다운로드가 제공되지 않습니다.\n\n실제 엑셀 추출은 로컬 Flask 서버 환경에서만 가능합니다.\n\n실행 방법:\n1. python app.py\n2. http://localhost:5000 접속\n3. 진단 자료 업로드 후 AI 매핑 실행\n4. 최종 엑셀 로드맵 추출');
            return;
        }

        btnExport.disabled = true;
        btnExport.style.opacity = '0.6';
        btnExport.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 추출 중...`;

        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = apiUrl('/api/export');
            form.style.display = 'none';

            const inputData = document.createElement('input');
            inputData.type = 'hidden';
            inputData.name = 'data';
            inputData.value = JSON.stringify({
                results: mappedResults,
                company: uploadedData ? uploadedData.company : '고객사',
                env_filepath: envFilepath,
                asset_filepath: assetFilepath
            });

            form.appendChild(inputData);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            
            setTimeout(() => {
                btnExport.disabled = false;
                btnExport.style.opacity = '1';
                btnExport.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> 최종 엑셀 로드맵 추출`;
            }, 1500);
        } catch (err) {
            console.error(err);
            alert('다운로드 시도 중 오류 발생: ' + err.message);
            btnExport.disabled = false;
            btnExport.style.opacity = '1';
            btnExport.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> 최종 엑셀 로드맵 추출`;
        }
    });

    // 7. 업로드 임시 파일 일괄 정리
    const btnClearUploads = document.getElementById('btn-clear-uploads');
    if (btnClearUploads) {
        btnClearUploads.addEventListener('click', () => {
            if (isDemoMode) {
                alert('📋 데모 모드에서는 서버 관리 기능이 제공되지 않습니다.');
                return;
            }
            if (confirm('정말 업로드된 모든 임시 엑셀 파일들을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                btnClearUploads.disabled = true;
                btnClearUploads.style.opacity = '0.6';
                btnClearUploads.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 비우는 중...`;

                fetch(apiUrl('/api/uploads/clear'), {
                    method: 'POST'
                })
                .then(res => res.json())
                .then(data => {
                    btnClearUploads.disabled = false;
                    btnClearUploads.style.opacity = '1';
                    btnClearUploads.innerHTML = `<i class="fa-solid fa-trash-can"></i> 임시 파일 일괄 비우기`;
                    alert(data.message || '임시 파일이 삭제되었습니다.');
                    uploadedData = null;
                    envFilepath = null;
                    assetFilepath = null;
                    fileInfo.innerHTML = '';
                    if (fileInfoEnv) fileInfoEnv.innerHTML = '';
                    if (fileInfoAsset) fileInfoAsset.innerHTML = '';
                    uploadActions.style.display = 'none';
                    resultCard.style.display = 'none';
                    
                    const listPanel = document.getElementById('uploads-list-panel');
                    if (listPanel && listPanel.style.display !== 'none') {
                        loadUploadsList();
                    }
                })
                .catch(err => {
                    btnClearUploads.disabled = false;
                    btnClearUploads.style.opacity = '1';
                    btnClearUploads.innerHTML = `<i class="fa-solid fa-trash-can"></i> 임시 파일 일괄 비우기`;
                    console.error(err);
                    alert('파일 정리 통신 실패');
                });
            }
        });
    }

    // 8. RAG 지식 베이스 초기화
    const btnClearRag = document.getElementById('btn-clear-rag');
    if (btnClearRag) {
        btnClearRag.addEventListener('click', () => {
            if (isDemoMode) {
                alert('📋 데모 모드에서는 서버 관리 기능이 제공되지 않습니다.');
                return;
            }
            if (confirm('⚠️ 경고: RAG 지식 베이스를 초기화하면 벡터 데이터베이스에 캐싱된 자사 솔루션의 청크 정보가 완전히 삭제됩니다.\n\n정말 초기화하시겠습니까?')) {
                btnClearRag.disabled = true;
                btnClearRag.style.opacity = '0.6';
                btnClearRag.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 초기화 중...`;

                fetch(apiUrl('/api/rag/clear'), {
                    method: 'POST'
                })
                .then(res => res.json())
                .then(data => {
                    btnClearRag.disabled = false;
                    btnClearRag.style.opacity = '1';
                    btnClearRag.innerHTML = `<i class="fa-solid fa-dumpster-fire"></i> RAG 지식 베이스 초기화`;
                    alert(data.message || 'RAG 데이터가 성공적으로 초기화되었습니다.');
                    
                    const listPanel = document.getElementById('rag-list-panel');
                    if (listPanel && listPanel.style.display !== 'none') {
                        loadRagList();
                    }
                })
                .catch(err => {
                    btnClearRag.disabled = false;
                    btnClearRag.style.opacity = '1';
                    btnClearRag.innerHTML = `<i class="fa-solid fa-dumpster-fire"></i> RAG 지식 베이스 초기화`;
                    console.error(err);
                    alert('RAG 초기화 통신 실패');
                });
            }
        });
    }

    // 9. 업로드 임시 파일 현황 조회 및 토글
    const btnViewUploads = document.getElementById('btn-view-uploads');
    const uploadsListPanel = document.getElementById('uploads-list-panel');
    if (btnViewUploads && uploadsListPanel) {
        btnViewUploads.addEventListener('click', () => {
            if (uploadsListPanel.style.display === 'none') {
                uploadsListPanel.style.display = 'block';
                btnViewUploads.innerHTML = `<i class="fa-solid fa-eye-slash"></i> 현황 닫기`;
                if (isDemoMode) {
                    const tbody = document.getElementById('uploads-list-tbody');
                    const countText = document.getElementById('uploads-count-text');
                    if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #888;">📋 데모 모드: 서버 연결이 필요합니다.</td></tr>`;
                    if (countText) countText.textContent = '데모 모드';
                } else {
                    loadUploadsList();
                }
            } else {
                uploadsListPanel.style.display = 'none';
                btnViewUploads.innerHTML = `<i class="fa-solid fa-eye"></i> 현황 보기`;
            }
        });
    }

    function loadUploadsList() {
        const tbody = document.getElementById('uploads-list-tbody');
        const countText = document.getElementById('uploads-count-text');
        if (!tbody) return;

        if (btnViewUploads) btnViewUploads.disabled = true;

        tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #888;"><i class="fa-solid fa-spinner fa-spin"></i> 로딩 중...</td></tr>`;

        fetch(apiUrl('/api/uploads/list'))
        .then(res => res.json())
        .then(data => {
            if (btnViewUploads) btnViewUploads.disabled = false;

            if (data.status === 'success') {
                if (countText) countText.textContent = `${data.files.length}개 파일`;
                if (data.files.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #666;">보관된 임시 파일이 없습니다.</td></tr>`;
                    return;
                }
                tbody.innerHTML = '';
                data.files.forEach(file => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    tr.innerHTML = `
                        <td style="padding: 8px; font-weight: 500; color: #fff;">${file.filename}</td>
                        <td style="padding: 8px;">${file.size.toLocaleString()}</td>
                        <td style="padding: 8px; color: #888;">${file.created_at}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--accent-red);">${data.message}</td></tr>`;
            }
        })
        .catch(err => {
            if (btnViewUploads) btnViewUploads.disabled = false;
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--accent-red);">파일 목록 조회 실패</td></tr>`;
        });
    }

    // 10. RAG 지식 DB 데이터 현황 조회 및 토글
    const btnViewRag = document.getElementById('btn-view-rag');
    const ragListPanel = document.getElementById('rag-list-panel');
    if (btnViewRag && ragListPanel) {
        btnViewRag.addEventListener('click', () => {
            if (ragListPanel.style.display === 'none') {
                ragListPanel.style.display = 'block';
                btnViewRag.innerHTML = `<i class="fa-solid fa-eye-slash"></i> 현황 닫기`;
                if (isDemoMode) {
                    const tbody = document.getElementById('rag-list-tbody');
                    const badge = document.getElementById('rag-count-badge');
                    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #888;">📋 데모 모드: 서버 연결이 필요합니다.</td></tr>`;
                    if (badge) badge.textContent = '데모 모드';
                } else {
                    loadRagList();
                }
            } else {
                ragListPanel.style.display = 'none';
                btnViewRag.innerHTML = `<i class="fa-solid fa-eye"></i> 현황 보기`;
            }
        });
    }

    function loadRagList() {
        const tbody = document.getElementById('rag-list-tbody');
        const badge = document.getElementById('rag-count-badge');
        if (!tbody) return;

        if (btnViewRag) btnViewRag.disabled = true;

        tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #888;"><i class="fa-solid fa-spinner fa-spin"></i> 로딩 중...</td></tr>`;

        fetch(apiUrl('/api/rag/list'))
        .then(res => res.json())
        .then(data => {
            if (btnViewRag) btnViewRag.disabled = false;

            if (data.status === 'success') {
                if (badge) badge.textContent = `${data.count}건`;
                if (data.count === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #666;">임베딩된 RAG 지식 데이터가 없습니다. (자사 보안 솔루션 리스트 재구축 필요)</td></tr>`;
                    return;
                }
                tbody.innerHTML = '';
                data.data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    tr.innerHTML = `
                        <td style="padding: 8px; color: #888;">${item.id}</td>
                        <td style="padding: 8px;"><span class="table-badge badge-blue" style="font-size:0.7rem;">${item.보안영역}</span></td>
                        <td style="padding: 8px; color: #ddd;">${item.솔루션구분}</td>
                        <td style="padding: 8px; color: var(--accent-blue); font-weight:600;">${item.제조사명}</td>
                        <td style="padding: 8px; color: #fff; font-weight:600;">${item.제품명}</td>
                        <td style="padding: 8px; color: #aaa; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.제품명기능설명}">${item.제품명기능설명}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: var(--accent-red);">${data.message}</td></tr>`;
            }
        })
        .catch(err => {
            if (btnViewRag) btnViewRag.disabled = false;
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: var(--accent-red);">RAG 데이터 조회 실패</td></tr>`;
        });
    }
}
