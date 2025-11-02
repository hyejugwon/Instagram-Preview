// Internationalization (i18n) 기능
(function() {
  'use strict';

  // 현재 언어 상태 (localStorage에 저장)
  let currentLang = localStorage.getItem('preferred-language') || 'en';

  // 언어 변경 함수
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('preferred-language', lang);
    document.documentElement.setAttribute('lang', lang);
    
    // body 클래스 업데이트
    if (lang === 'kr') {
      document.body.classList.add('lang-kr');
      document.body.classList.remove('lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-kr');
    }
    
    updateTexts();
    updateLangButtons();
  }

  // 모든 텍스트 업데이트 및 폰트 클래스 변경
  function updateTexts() {
    const elements = document.querySelectorAll('[data-i18n-en], [data-i18n-kr]');
    
    elements.forEach(element => {
      const enText = element.getAttribute('data-i18n-en');
      const krText = element.getAttribute('data-i18n-kr');
      
      if (!enText || !krText) return;
      
      const text = currentLang === 'kr' ? krText : enText;
      
      // HTML 포함된 경우 (예: <br> 태그, <span> 태그)
      if (text.includes('<')) {
        element.innerHTML = text;
        // 내부의 .en 클래스를 가진 span 요소는 항상 en 클래스 유지
        const enSpans = element.querySelectorAll('span.en');
        enSpans.forEach(span => {
          span.classList.remove('kr');
          span.classList.add('en');
        });
      } else {
        element.textContent = text;
      }
      
      // 폰트 클래스 업데이트 (en <-> kr) - 단, .en 클래스를 가진 자식 요소는 제외
      if (currentLang === 'kr') {
        element.classList.remove('en');
        element.classList.add('kr');
      } else {
        element.classList.remove('kr');
        element.classList.add('en');
      }
    });
    
    // body나 app 요소에도 언어 클래스 적용
    const app = document.querySelector('.app');
    if (app) {
      if (currentLang === 'kr') {
        app.classList.remove('lang-en');
        app.classList.add('lang-kr');
      } else {
        app.classList.remove('lang-kr');
        app.classList.add('lang-en');
      }
    }
  }

  // 언어 버튼 상태 업데이트
  function updateLangButtons() {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-lang') === currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 언어 버튼 클릭 이벤트 핸들러 (이벤트 위임 사용)
  let langButtonHandler = null;
  
  function initLangButtons() {
    // 이미 등록되어 있으면 중복 등록 방지
    if (langButtonHandler) return;
    
    // 이벤트 위임: document에 클릭 이벤트 등록
    langButtonHandler = function(e) {
      const langBtn = e.target.closest('.lang-btn');
      if (langBtn) {
        e.preventDefault();
        e.stopPropagation();
        const lang = langBtn.getAttribute('data-lang');
        if (lang) {
          setLanguage(lang);
        }
      }
    };
    
    document.addEventListener('click', langButtonHandler);
  }

  // 초기화
  function init() {
    // 저장된 언어 설정 적용
    document.documentElement.setAttribute('lang', currentLang);
    
    // 초기 언어에 맞춰 전체 페이지 폰트 클래스 설정
    if (currentLang === 'kr') {
      document.body.classList.add('lang-kr');
      document.body.classList.remove('lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-kr');
    }
    
    updateTexts();
    updateLangButtons();
    initLangButtons();
  }

  // 동적으로 추가된 요소를 위한 업데이트 함수
  function refreshLanguage() {
    updateTexts();
    updateLangButtons();
  }

  // DOM이 로드되면 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 외부에서 언어 변경 가능하도록 export
  window.setLanguage = setLanguage;
  window.getCurrentLanguage = () => currentLang;
  window.refreshLanguage = refreshLanguage;
})();

