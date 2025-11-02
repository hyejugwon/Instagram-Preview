// 공통 토스트 컴포넌트
(function() {
  'use strict';

  /**
   * 토스트 메시지 표시
   * @param {string|Object} message - 표시할 메시지 (문자열 또는 {en: string, kr: string} 객체)
   * @param {number} duration - 표시 시간(ms, 기본값: 3000)
   */
  function showToast(message, duration = 3000) {
    // 기존 토스트가 있으면 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // 메시지 텍스트 결정
    let messageText = '';
    if (typeof message === 'string') {
      messageText = message;
    } else if (message && message.en && message.kr) {
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      messageText = currentLang === 'kr' ? message.kr : message.en;
    } else {
      messageText = String(message);
    }
    
    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = messageText;
    
    // DOM에 추가
    document.body.appendChild(toast);
    
    // 애니메이션을 위한 약간의 지연
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // duration 후 제거
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, duration);
  }

  // 전역 함수로 export
  window.showToast = showToast;
})();

