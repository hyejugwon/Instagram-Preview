// Text Character Counter 초기화
(function () {
  let initialized = false;
  
  function init() {
    if (initialized) return;
    
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const charCountNoSpaces = document.getElementById('charCountNoSpaces');
    const wordCount = document.getElementById('wordCount');
    const lineCount = document.getElementById('lineCount');
    const repeatedWordsContainer = document.getElementById('repeatedWordsContainer');
    const morphemeSection = document.querySelector('.morpheme-section');
    
    if (!textInput || !charCount || !charCountNoSpaces || !wordCount || !lineCount || !repeatedWordsContainer || !morphemeSection) {
      return;
    }
    
    initialized = true;
    
    // 구두점 제거 함수 (표시용)
    function removePunctuation(word) {
      return word.replace(/[.,?!]/g, '');
    }
    
    // 보조사 제거 함수 (비교용 및 표시용)
    function removeParticles(word) {
      // 보조사 목록: 은, 는, 이, 가, 에게, 을, 를, 의
      // 긴 보조사를 먼저 체크해야 함 (예: "에게"가 "에"보다 먼저)
      const particles = ['에게', '은', '는', '이', '가', '을', '를', '의'];
      
      // 단어 끝에서 보조사 제거
      for (const particle of particles) {
        if (word.endsWith(particle)) {
          const wordWithoutParticle = word.slice(0, -particle.length);
          // 보조사 제거 후 한 글자가 되면 보조사 제거하지 않음
          if (wordWithoutParticle.length <= 1) {
            return word;
          }
          return wordWithoutParticle;
        }
      }
      
      return word;
    }
    
    // 통계 업데이트 함수
    function updateStats() {
      const text = textInput.value;
      
      // 글자 수 (공백 포함)
      const chars = text.length;
      
      // 글자 수 (공백 제외)
      const charsNoSpaces = text.replace(/\s/g, '').length;
      
      // 단어 수 (공백으로 구분)
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      
      // 줄 수
      const lines = text === '' ? 0 : text.split('\n').length;
      
      // UI 업데이트
      charCount.textContent = chars.toLocaleString();
      charCountNoSpaces.textContent = charsNoSpaces.toLocaleString();
      wordCount.textContent = words.toLocaleString();
      lineCount.textContent = lines.toLocaleString();
      
      // 반복 단어 분석
      updateRepeatedWords(text);
    }
    
    // 반복 단어 분석 함수 (6번 이상 반복되는 단어 찾기)
    function updateRepeatedWords(text) {
      // 형태소 분석기 영역은 항상 표시
      morphemeSection.style.display = 'flex';
      
      if (!text || text.trim() === '') {
        // 텍스트가 없으면 안내 메시지 표시
        repeatedWordsContainer.innerHTML = '<div class="empty-message" data-i18n-en="Only morphemes used 6 or more times are displayed" data-i18n-kr="6회 이상 사용된 형태소들만 노출됩니다">6회 이상 사용된 형태소들만 노출됩니다</div>';
        if (window.refreshLanguage) {
          setTimeout(() => window.refreshLanguage(), 0);
        }
        return;
      }
      
      // 띄어쓰기를 기준으로 단어 분리
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      
      // 단어 빈도 계산 (보조사 제거 후 비교)
      const wordCounts = {};
      const wordDisplayMap = {}; // 원본 단어 저장 (표시용)
      
      words.forEach(word => {
        // 구두점 제거 (표시용)
        const wordWithoutPunctuation = removePunctuation(word);
        
        // 빈 단어는 건너뛰기
        if (!wordWithoutPunctuation || wordWithoutPunctuation.trim() === '') {
          return;
        }
        
        // 보조사 제거 (표시용 - 원본 대소문자 유지)
        const displayWord = removeParticles(wordWithoutPunctuation);
        
        // 보조사 제거 (비교용 - 소문자로 정규화)
        const normalizedWord = removeParticles(wordWithoutPunctuation.toLowerCase());
        
        // 보조사 제거 후 빈 단어가 되면 원본 사용
        const finalWord = normalizedWord || wordWithoutPunctuation.toLowerCase();
        const finalDisplayWord = displayWord || wordWithoutPunctuation;
        
        // 한 글자 단어는 제외 (단, '듯'은 예외)
        if (finalWord.length <= 1 && finalWord !== '듯') {
          return;
        }
        
        // 빈도 계산
        if (!wordCounts[finalWord]) {
          wordCounts[finalWord] = 0;
          // 표시용: 보조사가 제거된 단어 저장 (원본 대소문자 유지)
          wordDisplayMap[finalWord] = finalDisplayWord;
        }
        wordCounts[finalWord]++;
      });
      
      // 6번 이상 반복되는 단어 필터링 및 정렬
      const repeatedWords = Object.entries(wordCounts)
        .filter(([word, count]) => count >= 6)
        .sort((a, b) => b[1] - a[1]) // 빈도순 정렬
        .map(([word, count]) => {
          // 표시용: 보조사가 제거된 단어 사용 (대소문자 원본 유지)
          const displayWord = wordDisplayMap[word] || word;
          return [displayWord, count];
        });
      
      if (repeatedWords.length === 0) {
        repeatedWordsContainer.innerHTML = '<div class="empty-message" data-i18n-en="Only morphemes used 6 or more times are displayed" data-i18n-kr="6회 이상 사용된 형태소들만 노출됩니다">6회 이상 사용된 형태소들만 노출됩니다</div>';
        if (window.refreshLanguage) {
          setTimeout(() => window.refreshLanguage(), 0);
        }
        return;
      }
      
      // 반복 단어 목록 렌더링
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      
      repeatedWordsContainer.innerHTML = repeatedWords.map(([word, count]) => {
        // 표시할 때는 구두점이 이미 제거된 상태
        const countClass = count >= 10 ? 'repeated-word-count--highlight' : '';
        return `
          <div class="repeated-word-item">
            <span class="repeated-word-text">${word}</span>
            <span class="repeated-word-count ${countClass}">${count}${currentLang === 'kr' ? '회' : ''}</span>
          </div>
        `;
      }).join('');
    }
    
    // 텍스트 입력 이벤트
    textInput.addEventListener('input', updateStats);
    textInput.addEventListener('paste', () => {
      setTimeout(updateStats, 0);
    });
    
    // 초기 통계 업데이트
    updateStats();
    
    // placeholder 다국어 처리
    function updatePlaceholder() {
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      const placeholderAttr = currentLang === 'kr' 
        ? 'data-i18n-placeholder-kr' 
        : 'data-i18n-placeholder-en';
      const placeholder = textInput.getAttribute(placeholderAttr) || '';
      textInput.placeholder = placeholder;
    }
    
    // 언어 변경 감지
    if (window.refreshLanguage) {
      const originalRefreshLanguage = window.refreshLanguage;
      window.refreshLanguage = function() {
        originalRefreshLanguage();
        updatePlaceholder();
        // 반복 단어 목록도 다시 렌더링 (언어 변경 시)
        updateRepeatedWords(textInput.value);
      };
    }
    
    updatePlaceholder();
  }
  
  // header 높이 계산 및 CSS 변수 설정
  function setCSSHeaderH() {
    const header = document.querySelector('.header');
    if (header) {
      const headerHeight = header.offsetHeight;
      document.documentElement.style.setProperty('--header-h', headerHeight + 'px');
    }
  }
  
  // CSS footer 높이 설정 함수
  function setCSSFooterH(h) {
    document.documentElement.style.setProperty('--footer-h', h + 'px');
  }
  
  // 광고 초기화 함수
  function initAds() {
    const ins = document.querySelector('.footer .adsbygoogle');
    if (!ins) return;
    
    const BP = 430; // 화면 너비 임계값
    const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    
    let width, height;
    if (w <= BP) {
      // 모바일: 폭 100%로 두고 높이 100px
      width = '100%';
      height = 100;
    } else {
      // 데스크톱: 100% 너비, 높이 100px
      width = '100%';
      height = 100;
    }
    
    // 스타일/속성 적용
    ins.style.width = (typeof width === 'number' ? width + 'px' : width);
    ins.style.height = height + 'px';
    ins.setAttribute('data-full-width-responsive', 'false');
    
    // 푸터 높이 동기화
    setCSSFooterH(height);
    
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch(e) {
      console.debug('[ads]', e);
    }
  }
  
  // 사이드 레일 광고 초기화 함수
  function initSideRailAds() {
    if (window.innerWidth < 900) return; // 모바일에서는 실행 안 함
    
    const leftAd = document.querySelector('.side-rail-ad--left .adsbygoogle');
    const rightAd = document.querySelector('.side-rail-ad--right .adsbygoogle');
    
    // 사이드 레일 광고 크기 설정 (160x600)
    [leftAd, rightAd].forEach(ins => {
      if (!ins) return;
      ins.style.width = '160px';
      ins.style.height = '600px';
      ins.setAttribute('data-full-width-responsive', 'false');
      
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch(e) {
        console.debug('[side-rail-ads]', e);
      }
    });
  }
  
  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      // header 높이 설정 (렌더링 후)
      setTimeout(() => {
        setCSSHeaderH();
        initAds();
        initSideRailAds();
        // 리사이즈 시 header 높이 재계산
        window.addEventListener('resize', setCSSHeaderH);
      }, 100);
    });
  } else {
    init();
    // header 높이 설정 (렌더링 후)
    setTimeout(() => {
      setCSSHeaderH();
      initAds();
      initSideRailAds();
      // 리사이즈 시 header 높이 재계산
      window.addEventListener('resize', setCSSHeaderH);
    }, 100);
  }
  
  // 리사이즈 시 사이드 레일 광고 재초기화
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) {
      initSideRailAds();
    }
  });
})();

