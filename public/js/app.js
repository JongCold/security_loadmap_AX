/**
 * Security Roadmap Agent - Vercel 배포용 프론트엔드 스크립트
 * 
 * 변경점:
 * 1. 데모 모드(목업 데이터) 제거 - 실 운영 전용
 * 2. API_BASE_URL 수동 설정 및 로컬스토리지 저장 기능 구현
 * 3. Mixed Content 방지 안내 및 연결성 탐지 고도화
 */

const CONFIG = {
    DEFAULT_API_BASE_URL: 'http://127.0.0.1:5000',
    HEALTH_CHECK_TIMEOUT: 3000,
    LOCAL_BACKEND_CANDIDATES: [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'https://localhost:5000',
        'https://127.0.0.1:5000'
    ]
};

// 전역 상태 변수
let currentApiBaseUrl = '';
let isConnected = false;
let uploadedData = null;
let mappedResults = null;
let envFilepath = null;
let assetFilepath = null;

// ====================================================================
// 초기화 및 연결 탐지 로직
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. API 주소 초기값 설정 (로컬 스토리지 -> 기본값 순)
    const savedUrl = localStorage.getItem('SECURITY_AGENT_API_URL');
    if (savedUrl) {
        currentApiBaseUrl = savedUrl;
    } else {
        // 지정된 주소가 없으면 로컬 후보들 중 동작하는 것을 자동 검색
        currentApiBaseUrl = await autoDetectBackend() || CONFIG.DEFAULT_API_BASE_URL;
    }

    // UI 요소 바인딩 및 이벤트 초기화
    initializeUI();

    // 연결 시도 및 UI 동기화
    await checkAndApplyConnection(currentApiBaseUrl);
});

/**
 * 로컬 Flask 후보 서버 자동 탐색
 */
async function autoDetectBackend() {
    console.log('[시스템] API_BASE_URL 미지정 — 로컬 Flask 서버 후보 탐색 시작...');
    for (const candidateUrl of CONFIG.LOCAL_BACKEND_CANDIDATES) {
        const connected = await tryConnectBackend(candidateUrl);
        if (connected) {
            console.log(`[시스템] 자동 감지 성공: ${candidateUrl}`);
            return candidateUrl;
        }
    }
    return null;
}

/**
 * 지정된 백엔드 URL에 헬스체크를 시도
 */
async function tryConnectBackend(baseUrl) {
    if (!baseUrl) return false;
    // URL 끝에 / 가 있으면 제거하여 통일
    const formattedUrl = baseUrl.replace(/\/+$/, "");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.HEALTH_CHECK_TIMEOUT);
        
        const response = await fetch(`${formattedUrl}/api/rag/status`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        return response.ok;
    } catch (e) {
        console.warn(`[시스템] 연결 실패 (${formattedUrl}):`, e.message);
        return false;
    }
}

/**
 * 연결 상태 체크 및 UI 업데이트 적용
 */
async function checkAndApplyConnection(targetUrl) {
    const formattedUrl = targetUrl.replace(/\/+$/, "");
    const statusBadge = document.getElementById('connection-status-badge');
    const errorGuide = document.getElementById('connection-error-guide');
    const urlInput = document.getElementById('api-url-input');
    
    if (urlInput) {
        urlInput.value = formattedUrl;
    }

    // 헬스체크 시도
    isConnected = await tryConnectBackend(formattedUrl);
    
    if (isConnected) {
        currentApiBaseUrl = formattedUrl;
        localStorage.setItem('SECURITY_AGENT_API_URL', formattedUrl);
        
        // 연결 성공 UI
        if (statusBadge) {
            statusBadge.className = 'table-badge badge-green';
            statusBadge.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent-green);"></span> 연결 완료`;
        }
        if (errorGuide) {
            errorGuide.style.display = 'none'; // 경고창 숨김
        }
        console.log(`[시스템] 백엔드 서버 연동 성공! URL: ${currentApiBaseUrl}`);
        toggleInputs(false); // 입력 활성화
    } else {
        // 연결 실패 UI
        if (statusBadge) {
            statusBadge.className = 'table-badge badge-red';
            statusBadge.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent-red);"></span> 연결 끊김`;
        }
        if (errorGuide) {
            errorGuide.style.display = 'block'; // 경고창 노출
        }
        console.warn(`[시스템] 백엔드 서버에 연결할 수 없습니다. URL: ${formattedUrl}`);
        toggleInputs(true); // 입력 비활성화
    }
}

/**
 * 서버 미연결 상태일 때 관련 컨트롤 비활성화 처리
 */
function toggleInputs(disabled) {
    const fileInputs = ['file-input', 'file-input-env', 'file-input-asset'];
    fileInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });

    const dropzones = ['dropzone', 'dropzone-env', 'dropzone-asset'];
    dropzones.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (disabled) {
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
            } else {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    const btnMapStart = document.getElementById('btn-map-start');
    if (btnMapStart) btnMapStart.disabled = disabled;
}

/**
 * API 호출용 URL 래퍼
 */
function apiUrl(path) {
    return `${currentApiBaseUrl}${path}`;
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

    // 백엔드 연결 제어 관련 바인딩
    const btnConnectBackend = document.getElementById('btn-connect-backend');
    const apiUrlInput = document.getElementById('api-url-input');

    if (btnConnectBackend && apiUrlInput) {
        btnConnectBackend.addEventListener('click', async () => {
            const targetUrl = apiUrlInput.value.trim();
            if (!targetUrl) {
                alert('연결할 백엔드 API 서버 URL을 입력해주세요.');
                return;
            }
            btnConnectBackend.disabled = true;
            btnConnectBackend.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 연결 중...`;
            await checkAndApplyConnection(targetUrl);
            btnConnectBackend.disabled = false;
            btnConnectBackend.innerHTML = `<i class="fa-solid fa-circle-check"></i> 연결하기`;
        });
    }

    // 1. 드롭존 클릭 시 파일 브라우저 열기
    if (dropzone) dropzone.addEventListener('click', () => fileInput.click());
    if (dropzoneEnv) dropzoneEnv.addEventListener('click', () => fileInputEnv.click());
    if (dropzoneAsset) dropzoneAsset.addEventListener('click', () => fileInputAsset.click());

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
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

        if (!isConnected) {
            alert('백엔드 서버와 연결이 끊어진 상태입니다. 연결 상태를 확인하십시오.');
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

        if (!isConnected) {
            alert('백엔드 서버와 연결이 끊어진 상태입니다.');
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

        if (!isConnected) {
            alert('백엔드 서버와 연결이 끊어진 상태입니다.');
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

        if (!isConnected) {
            alert('백엔드 서버 연동이 필요한 작업입니다.');
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

        if (!isConnected) {
            alert('서버 연결이 해제되어 엑셀 다운로드가 불가능합니다.');
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
            if (!isConnected) {
                alert('서버 연결이 필요합니다.');
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
            if (!isConnected) {
                alert('서버 연결이 필요합니다.');
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
                if (!isConnected) {
                    const tbody = document.getElementById('uploads-list-tbody');
                    const countText = document.getElementById('uploads-count-text');
                    if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #888;">📋 서버 연결이 필요합니다.</td></tr>`;
                    if (countText) countText.textContent = '연결 필요';
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
                if (!isConnected) {
                    const tbody = document.getElementById('rag-list-tbody');
                    const badge = document.getElementById('rag-count-badge');
                    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #888;">📋 서버 연결이 필요합니다.</td></tr>`;
                    if (badge) badge.textContent = '연결 필요';
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
