// 공통 모달 컴포넌트
(function() {
  'use strict';

  // 모달 인스턴스 관리
  let modalInstances = new Map();

  /**
   * 모달 표시
   * @param {Object} options - 모달 옵션
   * @param {string} options.title - 모달 타이틀 (또는 data-i18n-en, data-i18n-kr 포함 객체)
   * @param {string} options.cancelText - 취소 버튼 텍스트 (또는 data-i18n-en, data-i18n-kr 포함 객체)
   * @param {string} options.confirmText - 확인 버튼 텍스트 (또는 data-i18n-en, data-i18n-kr 포함 객체)
   * @param {Function} options.onCancel - 취소 버튼 클릭 시 콜백
   * @param {Function} options.onConfirm - 확인 버튼 클릭 시 콜백
   * @param {string} options.confirmClass - 확인 버튼 클래스 (기본: 'delete')
   * @param {string} options.id - 모달 ID (선택사항, 없으면 자동 생성)
   * @returns {string} 모달 ID
   */
  function showModal(options) {
    const {
      title,
      cancelText = { en: 'Cancel', kr: '취소' },
      confirmText = { en: 'Confirm', kr: '확인' },
      onCancel,
      onConfirm,
      confirmClass = 'delete',
      id = `modal-${Date.now()}`
    } = options;

    // 기존 모달이 있으면 제거
    if (modalInstances.has(id)) {
      hideModal(id);
    }

    // 모달 HTML 생성
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    
    const modalCard = document.createElement('div');
    modalCard.className = 'modal-card';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.id = `${id}-title`;
    
    // 타이틀 설정 (문자열 또는 객체)
    if (typeof title === 'string') {
      titleEl.innerHTML = title;
    } else if (title && title.en && title.kr) {
      titleEl.setAttribute('data-i18n-en', title.en);
      titleEl.setAttribute('data-i18n-kr', title.kr);
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      const titleText = currentLang === 'kr' ? title.kr : title.en;
      // HTML 태그 지원 (예: <br>)
      if (titleText.includes('<')) {
        titleEl.innerHTML = titleText;
      } else {
        titleEl.textContent = titleText;
      }
    } else {
      titleEl.innerHTML = title || '';
    }
    
    overlay.setAttribute('aria-labelledby', titleEl.id);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action cancel';
    cancelBtn.id = `${id}-cancel`;
    
    // 취소 버튼 텍스트 설정
    if (typeof cancelText === 'string') {
      cancelBtn.textContent = cancelText;
    } else if (cancelText && cancelText.en && cancelText.kr) {
      cancelBtn.setAttribute('data-i18n-en', cancelText.en);
      cancelBtn.setAttribute('data-i18n-kr', cancelText.kr);
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      cancelBtn.textContent = currentLang === 'kr' ? cancelText.kr : cancelText.en;
    } else {
      cancelBtn.textContent = 'Cancel';
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = `action ${confirmClass}`;
    confirmBtn.id = `${id}-confirm`;
    
    // 확인 버튼 텍스트 설정
    if (typeof confirmText === 'string') {
      confirmBtn.textContent = confirmText;
    } else if (confirmText && confirmText.en && confirmText.kr) {
      confirmBtn.setAttribute('data-i18n-en', confirmText.en);
      confirmBtn.setAttribute('data-i18n-kr', confirmText.kr);
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      confirmBtn.textContent = currentLang === 'kr' ? confirmText.kr : confirmText.en;
    } else {
      confirmBtn.textContent = 'Confirm';
    }

    // 이벤트 리스너
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onCancel) onCancel();
      hideModal(id);
    });

    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // onConfirm 콜백 먼저 실행
      if (onConfirm) {
        const result = onConfirm();
        // Promise인 경우 처리
        if (result && typeof result.then === 'function') {
          result.then(() => {
            hideModal(id);
          }).catch(() => {
            hideModal(id);
          });
        } else {
          // 동기 함수인 경우 바로 닫기
          hideModal(id);
        }
      } else {
        hideModal(id);
      }
    });

    // 배경 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onCancel) onCancel();
        hideModal(id);
      }
    });

    // 구조 조립
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modalCard.appendChild(titleEl);
    modalCard.appendChild(actions);
    overlay.appendChild(modalCard);

    // DOM에 추가
    document.body.appendChild(overlay);

    // 모달 표시
    overlay.classList.add('show');

    // 언어 시스템에 새로 추가된 요소 업데이트
    if (window.refreshLanguage) {
      setTimeout(() => {
        window.refreshLanguage();
      }, 0);
    }

    // 인스턴스 저장
    modalInstances.set(id, {
      overlay,
      onCancel,
      onConfirm
    });

    return id;
  }

  /**
   * 모달 숨기기
   * @param {string} id - 모달 ID
   */
  function hideModal(id) {
    const instance = modalInstances.get(id);
    if (instance) {
      instance.overlay.classList.remove('show');
      setTimeout(() => {
        if (instance.overlay.parentNode) {
          instance.overlay.parentNode.removeChild(instance.overlay);
        }
        modalInstances.delete(id);
      }, 150); // transition 시간 고려
    }
  }

  // 외부 API
  window.showModal = showModal;
  window.hideModal = hideModal;
})();

