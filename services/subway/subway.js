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
              <p class="card__content-item kr">서브웨이 공식 홈페이지를 참고하였으나업데이트 날짜에 따라 정보가 차이가 있을 수 있습니다.</p>
              <p class="card__content-item kr">서브웨이 특성상 정량이 항상 동일하지 않기 때문에, 안내된 칼로리와 차이가 있을 수 있습니다.</p>
              <p class="card__content-item kr">메인 재료의 경우 한국 서브웨이, 그 외 한국 성분표에 공개되지 않은 정보의 경우 호주 성분표를 참고하였습니다.</p>
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
    
    // 샐러드 모드일 때 infoCard와 빵 선택 부분 숨기기
    function toggleSaladElements(isSalad) {
      // detailPage 내부에서 요소 찾기
      const selecArea = detailPage.querySelector('.selecArea');
      if (!selecArea) {
        console.log('selecArea not found');
        return;
      }
      
      const card = selecArea.querySelector('.card');
      
      // 빵 form 찾기: data-field="bread" 속성 먼저 시도
      let breadForm = selecArea.querySelector('.form[data-field="bread"]');
      
      // data-field가 없으면 formTitle 텍스트로 찾기
      if (!breadForm) {
        const allForms = selecArea.querySelectorAll('.form');
        breadForm = Array.from(allForms).find(form => {
          const formTitle = form.querySelector('.formTitle');
          if (!formTitle) return false;
          const titleText = formTitle.textContent.trim();
          return titleText === '빵';
        });
      }
      
      // 요소가 있으면 display 속성 설정 (!important 추가)
      if (card) {
        if (isSalad) {
          card.style.setProperty('display', 'none', 'important');
        } else {
          card.style.removeProperty('display');
        }
      } else {
        console.log('card not found');
      }
      
      if (breadForm) {
        if (isSalad) {
          breadForm.style.setProperty('display', 'none', 'important');
        } else {
          breadForm.style.removeProperty('display');
        }
      } else {
        console.log('breadForm not found');
        // 디버깅: 모든 form 확인
        const allForms = selecArea.querySelectorAll('.form');
        console.log('All forms:', Array.from(allForms).map(form => {
          const formTitle = form.querySelector('.formTitle');
          return formTitle ? formTitle.textContent.trim() : 'no title';
        }));
      }
    }
    
    // 초기 실행: 샌드위치 보여주기
    showPanel('sandwich');
    
    // 탭 클릭 이벤트 연결
    tabs.forEach(tab => {
      tab.addEventListener('click', () => showPanel(tab.dataset.target));
    });
    
    // 체크박스 아이콘을 인라인 SVG로 변경
    function convertCheckboxIcons() {
      // base 태그를 고려한 경로 매칭
      const base = document.querySelector('base');
      const basePath = base ? base.getAttribute('href') : '';
      const targetPath = basePath ? basePath.replace(/\/$/, '') + '/icons/circleCheck.svg' : '/icons/circleCheck.svg';
      const checkboxIcons = document.querySelectorAll(`.checkbox__icon img[src="${targetPath}"], .checkbox__icon img[src="/icons/circleCheck.svg"]`);
      checkboxIcons.forEach(img => {
        const svgHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0ZM14.6172 6.94336C14.2555 6.60269 13.6856 6.61988 13.3447 6.98145L8.88574 11.71L6.63281 9.47949C6.27959 9.1298 5.71005 9.13214 5.36035 9.48535C5.01065 9.83858 5.01397 10.4081 5.36719 10.7578L8.27637 13.6387C8.44866 13.809 8.68258 13.9026 8.9248 13.8984C9.16702 13.8942 9.39721 13.7924 9.56348 13.6162L14.6553 8.21582C14.9959 7.85415 14.9787 7.28424 14.6172 6.94336Z" fill="currentColor"/></svg>';
        img.outerHTML = svgHTML;
      });
    }
    
    // 칼로리 총합 계산 함수
    function calculateTotalCalories() {
      const detailPage = document.getElementById('detailPage');
      if (!detailPage) return;
      
      let totalCalories = 0;
      
      // 치즈 섹션에서 선택된 항목의 칼로리 찾기
      function getSelectedCheeseCalories() {
        const cheeseRadio = detailPage.querySelector('[data-radio-group="cheese"] .radio.is-selected');
        if (cheeseRadio) {
          const infoElement = cheeseRadio.querySelector('.radio__info');
          if (infoElement) {
            const infoText = infoElement.textContent.trim();
            const match = infoText.match(/(\d+)/);
            if (match) {
              return parseInt(match[1], 10);
            }
          }
        }
        return 0;
      }
      
      // 메인 재료 섹션에서 선택된 항목의 칼로리 찾기
      function getSelectedMainCalories() {
        const mainForm = detailPage.querySelector('[data-form-id="main"], #main');
        if (mainForm) {
          const mainSelect = mainForm.querySelector('select');
          if (mainSelect && mainSelect.value && mainSelect.value !== '') {
            const selectedOption = mainSelect.options[mainSelect.selectedIndex];
            if (selectedOption) {
              const info = selectedOption.getAttribute('data-info');
              if (info) {
                const match = info.match(/(\d+)/);
                if (match) {
                  return parseInt(match[1], 10);
                }
              }
            }
          }
        }
        return 0;
      }
      
      // 선택된 checkbox와 radio 찾기
      const selectedCheckboxes = detailPage.querySelectorAll('.checkbox.is-selected');
      const selectedRadios = detailPage.querySelectorAll('.radio.is-selected');
      
      // select에서 선택된 옵션 찾기
      const selects = detailPage.querySelectorAll('.select select');
      selects.forEach(select => {
        if (select.value && select.value !== '') {
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption) {
            const info = selectedOption.getAttribute('data-info');
            if (info) {
              // 숫자만 추출 (예: "180 kcal" -> 180)
              const match = info.match(/(\d+)/);
              if (match) {
                totalCalories += parseInt(match[1], 10);
              }
            }
          }
        }
      });
      
      // checkbox의 info에서 칼로리 추출
      selectedCheckboxes.forEach(checkbox => {
        // special:인 경우 data 속성에서 확인
        const specialInfo = checkbox.getAttribute('data-special-info');
        if (specialInfo) {
          if (specialInfo === 'special:cheese') {
            const cheeseCalories = getSelectedCheeseCalories();
            totalCalories += cheeseCalories * 2;
            return;
          } else if (specialInfo === 'special:main') {
            const mainCalories = getSelectedMainCalories();
            totalCalories += mainCalories * 2;
            return;
          }
        }
        
        // 일반적인 경우: checkbox__info에서 칼로리 추출
        const infoElement = checkbox.querySelector('.checkbox__info');
        if (infoElement) {
          const infoText = infoElement.textContent.trim();
          // 숫자만 추출 (예: "180 kcal" -> 180)
          const match = infoText.match(/(\d+)/);
          if (match) {
            totalCalories += parseInt(match[1], 10);
          }
        }
      });
      
      // radio의 info에서 칼로리 추출
      selectedRadios.forEach(radio => {
        const infoElement = radio.querySelector('.radio__info');
        if (infoElement) {
          const infoText = infoElement.textContent.trim();
          // 숫자만 추출 (예: "180 kcal" -> 180)
          const match = infoText.match(/(\d+)/);
          if (match) {
            totalCalories += parseInt(match[1], 10);
          }
        }
      });
      
      // resultCalories 요소에 표시
      const resultCalories = document.querySelector('.resultCalories');
      if (resultCalories) {
        resultCalories.textContent = totalCalories || 0;
      }
    }
    
    // select change 이벤트 초기화
    function initSelectEvents() {
      const detailPage = document.getElementById('detailPage');
      if (!detailPage) return;
      
      // select change 이벤트 위임
      document.addEventListener('change', function(e) {
        const select = e.target.closest('.select select');
        if (select) {
          calculateTotalCalories();
        }
      });
    }
    
    // 체크박스 클릭 이벤트 초기화 (한 번만 등록)
    if (!checkboxInitialized) {
      // 동적으로 로드된 요소를 위해 이벤트 위임 사용
      document.addEventListener('click', function(e) {
        // 체크박스 처리
        const checkbox = e.target.closest('.checkbox');
        if (checkbox) {
          // disabled 상태면 클릭 무시
          if (checkbox.classList.contains('is-disabled')) return;
          
          // is-selected 클래스 토글
          checkbox.classList.toggle('is-selected');
          
          // 칼로리 총합 계산
          calculateTotalCalories();
          return;
        }
        
        // 라디오 버튼 처리 (단일 선택, 2번 클릭 시 해제)
        const radio = e.target.closest('.radio');
        if (radio) {
          // disabled 상태면 클릭 무시
          if (radio.classList.contains('is-disabled')) return;
          
          // 이미 선택된 라디오를 다시 클릭하면 해제
          if (radio.classList.contains('is-selected')) {
            radio.classList.remove('is-selected');
            // 칼로리 총합 계산
            calculateTotalCalories();
            return;
          }
          
          // 같은 그룹의 모든 라디오 찾기
          const radioGroup = radio.closest('[data-radio-group]');
          if (radioGroup) {
            const groupName = radioGroup.getAttribute('data-radio-group');
            const allRadiosInGroup = radioGroup.querySelectorAll('.radio');
            
            // 같은 그룹의 모든 라디오 선택 해제
            allRadiosInGroup.forEach(r => {
              r.classList.remove('is-selected');
            });
          }
          
          // 현재 라디오 선택
          radio.classList.add('is-selected');
          
          // 칼로리 총합 계산
          calculateTotalCalories();
          return;
        }
      });
      
      checkboxInitialized = true;
    }
  }
  
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
  