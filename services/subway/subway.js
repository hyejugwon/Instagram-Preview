// ✅ Subway 상세 페이지 로드 및 탭 전환
(function () {
  let initialized = false;
  let ingredientsContentLoaded = false;
  let checkboxInitialized = false;
  
  function init() {
    // 이미 초기화되었으면 중복 실행 방지
    if (initialized) return;
    
    const tabs = document.querySelectorAll('.tabs .tab');
    const detailPage = document.getElementById('detailPage');
    
    // 요소가 모두 존재하는지 확인
    if (!tabs.length || !detailPage) {
      return;
    }
    
    initialized = true;
    
    // ingredients 데이터를 로드하는 함수
    function loadIngredientsContent() {
      if (ingredientsContentLoaded) return Promise.resolve();
      
      // 이미 detailPage에 selecArea가 있는지 확인
      const selecArea = detailPage.querySelector('.selecArea');
      if (!selecArea) {
        ingredientsContentLoaded = true;
        return Promise.resolve();
      }
      
      // ingredients-render.js를 통해 데이터로부터 렌더링
      if (!window.renderIngredients) {
        console.error('renderIngredients function not found');
        ingredientsContentLoaded = true;
        return Promise.resolve();
      }
      
      return window.renderIngredients(selecArea).then(() => {
        // 아이콘 변환 실행
        convertCheckboxIcons();
        
        // select 이벤트 초기화
        initSelectEvents();
        
        // 정보 카드 추가
        if (!detailPage.querySelector('.card--information')) {
          const informationCard = document.createElement('div');
          informationCard.className = 'card card--information card--multiple';
          informationCard.innerHTML = `
            <div class="card__content">
              <p class="card__content-item kr">이 칼로리 계산기는 공식 Subway 계산기가 아니므로 공식 Data와 일치하지 않을 수 있습니다.</p>
              <p class="card__content-item kr">매장에서 성분표에 기재된 정량을 주지 않으면 해당 계산기의 Data와 일치하지 않을 수 있습니다.</p>
              <p class="card__content-item kr">Meat 메뉴의 경우, 한국 서브웨이의 각 상품페이지를 참고하여 작성하였습니다.</p>
              <p class="card__content-item kr">한국 성분표에 공개되지 않은 데이터의 경우 호주의 성분표 데이터를 참고하였습니다.</p>
            </div>
          `;
          detailPage.appendChild(informationCard);
        }
        
        // 초기 칼로리 총합 계산
        calculateTotalCalories();
        
        ingredientsContentLoaded = true;
      }).catch(err => {
        console.error('Failed to render ingredients:', err);
        ingredientsContentLoaded = true;
      });
    }
    
    function showPanel(name) {
      const isSalad = name === 'salad';
      
      // 탭 상태 갱신
      tabs.forEach(tab => {
        const active = tab.dataset.target === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active);
      });
      
      // ingredients 데이터가 로드되지 않았으면 로드
      if (!ingredientsContentLoaded) {
        loadIngredientsContent().then(() => {
          // DOM이 완전히 준비될 때까지 대기
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              toggleSaladElements(isSalad);
              // 아이콘 변환도 여기서 실행
              convertCheckboxIcons();
            });
          });
        });
      } else {
        // 이미 로드된 경우 requestAnimationFrame으로 실행
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            toggleSaladElements(isSalad);
          });
        });
      }
    }
    
    // 탭 클릭 이벤트
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        showPanel(tab.dataset.target);
      });
    });
    
    // 초기 패널 표시
    const activeTab = Array.from(tabs).find(t => t.classList.contains('is-active'));
    if (activeTab) {
      showPanel(activeTab.dataset.target);
    }
  }
  
  // 샐러드 탭일 때 정보 카드와 빵 선택 숨기기
  function toggleSaladElements(isSalad) {
    // 빵 선택 영역 찾기
    const breadForm = document.querySelector('[data-field="bread"]') || 
                     Array.from(document.querySelectorAll('.form')).find(form => {
                       const title = form.querySelector('.formTitle');
                       return title && title.textContent.includes('빵');
                     });
    
    if (breadForm) {
      breadForm.style.display = isSalad ? 'none !important' : '';
    }
    
    // 정보 카드 숨기기
    const infoCard = document.querySelector('.selecArea .card:first-child');
    if (infoCard && infoCard.querySelector('.card__content') && 
        infoCard.querySelector('.card__content').textContent.includes('샌드위치')) {
      infoCard.style.display = isSalad ? 'none !important' : '';
    }
  }
  
  // checkbox 아이콘을 SVG로 변환 (currentColor 사용을 위해)
  function convertCheckboxIcons() {
    if (checkboxInitialized) return;
    
    document.querySelectorAll('.checkbox__icon img[src*="circleCheck"], .radio__icon img[src*="radio"]').forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        fetch(src)
          .then(res => res.text())
          .then(svgText => {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            if (svgElement) {
              // img를 SVG로 교체
              img.parentNode.replaceChild(svgElement, img);
              // 크기 설정
              svgElement.setAttribute('width', '18');
              svgElement.setAttribute('height', '18');
              svgElement.style.display = 'block';
            }
          })
          .catch(err => console.error('Failed to convert icon:', err));
      }
    });
    
    checkboxInitialized = true;
  }
  
  // select 이벤트 초기화
  function initSelectEvents() {
    document.querySelectorAll('.select select').forEach(select => {
      select.addEventListener('change', () => {
        calculateTotalCalories();
      });
    });
  }
  
  // 체크박스/라디오 버튼 이벤트 초기화
  function initCheckboxRadioEvents() {
    // 체크박스 클릭 이벤트
    document.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.checkbox');
      if (checkbox && !checkbox.classList.contains('is-disabled')) {
        checkbox.classList.toggle('is-selected');
        calculateTotalCalories();
      }
      
      // 라디오 버튼 클릭 이벤트
      const radio = e.target.closest('.radio');
      if (radio && !radio.classList.contains('is-disabled')) {
        const form = radio.closest('.form');
        if (form) {
          const sameGroupRadios = form.querySelectorAll('.radio');
          const wasSelected = radio.classList.contains('is-selected');
          
          // 같은 그룹의 다른 라디오 버튼 선택 해제
          sameGroupRadios.forEach(r => r.classList.remove('is-selected'));
          
          // 같은 라디오 버튼을 다시 클릭하면 선택 해제
          if (wasSelected) {
            radio.classList.remove('is-selected');
          } else {
            radio.classList.add('is-selected');
          }
        }
        calculateTotalCalories();
      }
    });
  }
  
  // 칼로리 총합 계산
  function calculateTotalCalories() {
    let total = 0;
    
    // 선택된 체크박스의 칼로리 합산
    document.querySelectorAll('.checkbox.is-selected').forEach(checkbox => {
      const infoElement = checkbox.querySelector('.checkbox__info');
      if (infoElement) {
        const infoText = infoElement.textContent.trim();
        const match = infoText.match(/(\d+)\s*kcal/i);
        if (match) {
          let calories = parseInt(match[1], 10);
          
          // special:cheese 또는 special:main 처리
          const specialInfo = checkbox.getAttribute('data-special-info');
          if (specialInfo === 'special:cheese') {
            const cheeseCalories = getSelectedCheeseCalories();
            if (cheeseCalories > 0) {
              total += cheeseCalories * 2;
            }
          } else if (specialInfo === 'special:main') {
            const mainCalories = getSelectedMainCalories();
            if (mainCalories > 0) {
              total += mainCalories * 2;
            }
          } else {
            total += calories;
          }
        }
      }
    });
    
    // 선택된 라디오 버튼의 칼로리 합산
    document.querySelectorAll('.radio.is-selected').forEach(radio => {
      const infoElement = radio.querySelector('.radio__info');
      if (infoElement) {
        const infoText = infoElement.textContent.trim();
        const match = infoText.match(/(\d+)\s*kcal/i);
        if (match) {
          total += parseInt(match[1], 10);
        }
      }
    });
    
    // select의 칼로리 합산
    document.querySelectorAll('.select select').forEach(select => {
      const selectedOption = select.options[select.selectedIndex];
      if (selectedOption && selectedOption.textContent) {
        const match = selectedOption.textContent.match(/(\d+)\s*kcal/i);
        if (match) {
          total += parseInt(match[1], 10);
        }
      }
    });
    
    // 결과 업데이트
    const resultCalories = document.querySelector('.resultCalories');
    if (resultCalories) {
      resultCalories.textContent = total.toLocaleString();
    }
  }
  
  // 선택된 치즈의 칼로리 가져오기
  function getSelectedCheeseCalories() {
    const cheeseRadios = document.querySelectorAll('[data-form-id="cheese"] .radio.is-selected');
    if (cheeseRadios.length > 0) {
      const infoElement = cheeseRadios[0].querySelector('.radio__info');
      if (infoElement) {
        const infoText = infoElement.textContent.trim();
        const match = infoText.match(/(\d+)\s*kcal/i);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    return 0;
  }
  
  // 선택된 메인 재료의 칼로리 가져오기
  function getSelectedMainCalories() {
    const mainSelect = document.querySelector('[data-form-id="main"] select');
    if (mainSelect && mainSelect.selectedIndex > 0) {
      const selectedOption = mainSelect.options[mainSelect.selectedIndex];
      if (selectedOption && selectedOption.textContent) {
        const match = selectedOption.textContent.match(/(\d+)\s*kcal/i);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    return 0;
  }
  
  // 체크박스/라디오 이벤트 초기화
  initCheckboxRadioEvents();
  
  // 상세 정보 토글
  function initDetailToggle() {
    const detailBtn = document.getElementById('detailBtn');
    const nutritionInfo = document.getElementById('nutritionInfo');
    const result = document.querySelector('.result');
    
    if (!detailBtn || !nutritionInfo) return;
    
    // nutrition-info 위치 업데이트 (result 하단에 표시)
    function updateNutritionInfoPosition() {
      if (result && nutritionInfo.style.display !== 'none') {
        const resultRect = result.getBoundingClientRect();
        const stickyTop = 120; // header-topbar + tabs 높이
        const resultBottom = resultRect.bottom;
        nutritionInfo.style.top = `${resultBottom}px`;
      }
    }
    
    // nutrition-info 닫기 함수
    function closeNutritionInfo() {
      nutritionInfo.style.display = 'none';
      detailBtn.textContent = '상세보기';
    }
    
    // 외부 클릭 감지로 nutrition-info 닫기
    let clickOutsideHandler = null;
    
    function setupClickOutsideHandler() {
      if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler);
        clickOutsideHandler = null;
      }
      
      if (nutritionInfo.style.display !== 'none') {
        clickOutsideHandler = function(e) {
          // nutrition-info나 detailBtn 내부 클릭이 아니면 닫기
          if (!nutritionInfo.contains(e.target) && e.target !== detailBtn && !detailBtn.contains(e.target)) {
            closeNutritionInfo();
            // 이벤트 리스너 제거 (닫힌 후에는 더 이상 필요 없음)
            if (clickOutsideHandler) {
              document.removeEventListener('click', clickOutsideHandler);
              clickOutsideHandler = null;
            }
          }
        };
        // 이벤트 캡처링 단계에서 처리 (먼저 실행)
        document.addEventListener('click', clickOutsideHandler, true);
      }
    }
    
    // 상세보기 버튼 클릭 시 토글
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 전파 중단
      if (nutritionInfo.style.display === 'none') {
        nutritionInfo.style.display = 'block';
        detailBtn.textContent = '간략히';
        // result 높이 계산 후 위치 업데이트
        setTimeout(() => {
          updateNutritionInfoPosition();
          setupClickOutsideHandler();
        }, 0);
      } else {
        closeNutritionInfo();
        if (clickOutsideHandler) {
          document.removeEventListener('click', clickOutsideHandler, true);
          clickOutsideHandler = null;
        }
      }
    });
    
    // 윈도우 리사이즈 및 스크롤 시 위치 업데이트
    window.addEventListener('resize', updateNutritionInfoPosition);
    window.addEventListener('scroll', updateNutritionInfoPosition);
  }
  
  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initDetailToggle();
    });
  } else {
    init();
    initDetailToggle();
  }
})();

