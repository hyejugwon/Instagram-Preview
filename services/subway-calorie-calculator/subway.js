// ✅ Subway 상세 페이지 로드 및 탭 전환
(function () {
  let initialized = false;
  let ingredientsContentLoaded = false;
  let checkboxInitialized = false;
  let currentTab = null;
  
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
              <div class="info-section-container">
                <div class="info-section-item">
                  <div class="info-section-title h4--M" data-i18n-en="What is a Subway Calorie Calculator?" data-i18n-kr="서브웨이 칼로리 계산기란?">What is a Subway Calorie Calculator?</div>
                  <div class="info-section-text b1--R" data-i18n-en="Create your own Subway sandwich or salad with your desired combination. We will calculate the total calories consumed based on your selected options." data-i18n-kr="원하는 조합으로 서브웨이 샌드위치 또는 샐러드를 만들어보세요. 선택한 옵션에 따라 총 섭취 칼로리를 계산해드릴게요.">Create your own Subway sandwich or salad with your desired combination. We will calculate the total calories consumed based on your selected options.</div>
                </div>
                <div class="info-section-item">
                  <div class="info-section-title h4--M" data-i18n-en="Notes" data-i18n-kr="안내사항">Notes</div>
                  <div>
                    <p class="info-section-text has-bullet kr" data-i18n-en="Referenced from Subway official website, but information may vary depending on the update date." data-i18n-kr="서브웨이 공식 홈페이지를 참고하였으나 업데이트 날짜에 따라 정보가 차이가 있을 수 있습니다.">서브웨이 공식 홈페이지를 참고하였으나 업데이트 날짜에 따라 정보가 차이가 있을 수 있습니다.</p>
                    <p class="info-section-text has-bullet kr" data-i18n-en="Due to Subway's characteristics, quantities are not always the same, so there may be differences from the calories provided." data-i18n-kr="서브웨이 특성상 정량이 항상 동일하지 않기 때문에, 안내된 칼로리와 차이가 있을 수 있습니다.">서브웨이 특성상 정량이 항상 동일하지 않기 때문에, 안내된 칼로리와 차이가 있을 수 있습니다.</p>
                    <p class="info-section-text has-bullet kr" data-i18n-en="For main ingredients, Korean Subway was referenced. For other information not disclosed in Korean ingredient labels, Australian ingredient labels were referenced." data-i18n-kr="메인 재료의 경우 한국 서브웨이, 그 외 한국 성분표에 공개되지 않은 정보의 경우 호주 성분표를 참고하였습니다.">메인 재료의 경우 한국 서브웨이, 그 외 한국 성분표에 공개되지 않은 정보의 경우 호주 성분표를 참고하였습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          `;
          detailPage.appendChild(informationCard);
          // i18n 시스템 새로고침
          if (window.refreshLanguage) {
            setTimeout(() => {
              window.refreshLanguage();
            }, 0);
          }
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
      
      // 탭이 실제로 변경되었는지 확인
      const tabChanged = currentTab !== null && currentTab !== name;
      
      // 탭 상태 갱신
      tabs.forEach(tab => {
        const active = tab.dataset.target === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active);
      });
      
      // 탭이 변경되었으면 초기화
      if (tabChanged) {
        // 스크롤을 최상단으로 이동 (.contentsArea가 스크롤 컨테이너)
        const contentsArea = document.querySelector('.contentsArea');
        if (contentsArea) {
          contentsArea.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // nutrition-info 닫기
        const nutritionInfo = document.getElementById('nutritionInfo');
        const detailBtn = document.getElementById('detailBtn');
        if (nutritionInfo && nutritionInfo.style.display !== 'none') {
          nutritionInfo.style.display = 'none';
          // 언어에 맞는 텍스트 설정
          const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
          const detailText = currentLang === 'kr' ? '상세보기' : 'Details';
          if (detailBtn) {
            detailBtn.textContent = detailText;
          }
          // i18n 시스템 업데이트
          if (window.refreshLanguage) {
            setTimeout(() => {
              window.refreshLanguage();
            }, 0);
          }
        }
        
        // 선택한 옵션 전체 초기화
        resetAllSelections();
      }
      
      // 현재 탭 업데이트
      currentTab = name;
      
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
      
      // 메인 재료 form 찾기
      const mainForm = selecArea.querySelector('.form[data-form-id="main"], #main');
      
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
      
      // 메인 재료에 "(15cm 기준)" description 추가/제거
      if (mainForm) {
        const formHeader = mainForm.querySelector('.formHeader');
        if (formHeader) {
          let description = formHeader.querySelector('.description');
          
          if (!isSalad) {
            // 샌드위치 탭일 때 description 추가
            if (!description) {
              description = document.createElement('span');
              description.className = 'description b1--R kr';
              description.setAttribute('data-i18n-en', '(15cm standard)');
              description.setAttribute('data-i18n-kr', '(15cm 기준)');
              const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
              description.textContent = currentLang === 'kr' ? '(15cm 기준)' : '(15cm standard)';
              formHeader.appendChild(description);
              
              // i18n 시스템 업데이트
              if (window.refreshLanguage) {
                setTimeout(() => {
                  window.refreshLanguage();
                }, 0);
              }
            }
          } else {
            // 샐러드 탭일 때 description 제거
            if (description) {
              description.remove();
            }
          }
        }
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
      // 체크박스 아이콘을 SVG로 변환
      const checkboxIcons = document.querySelectorAll('.checkbox__icon img[src="/icons/circleCheck.svg"]');
      checkboxIcons.forEach(img => {
        const svgHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0ZM14.6172 6.94336C14.2555 6.60269 13.6856 6.61988 13.3447 6.98145L8.88574 11.71L6.63281 9.47949C6.27959 9.1298 5.71005 9.13214 5.36035 9.48535C5.01065 9.83858 5.01397 10.4081 5.36719 10.7578L8.27637 13.6387C8.44866 13.809 8.68258 13.9026 8.9248 13.8984C9.16702 13.8942 9.39721 13.7924 9.56348 13.6162L14.6553 8.21582C14.9959 7.85415 14.9787 7.28424 14.6172 6.94336Z" fill="currentColor"/></svg>';
        img.outerHTML = svgHTML;
      });
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
          
          // special 옵션 체크 (고기 추가, 치즈 추가)
          const specialInfo = checkbox.getAttribute('data-special-info');
          if (specialInfo) {
            const detailPage = document.getElementById('detailPage');
            if (!detailPage) return;
            
            if (specialInfo === 'special:main') {
              // 메인 재료가 선택되었는지 확인
              const mainForm = detailPage.querySelector('[data-form-id="main"], #main');
              const mainSelect = mainForm ? mainForm.querySelector('select') : null;
              const mainSelected = mainSelect && mainSelect.value && mainSelect.value !== '';
              
              if (!mainSelected) {
                // 토스트 표시
                if (window.showToast) {
                  window.showToast({
                    en: 'Please select a main ingredient first',
                    kr: '메인 재료를 먼저 선택해주세요'
                  });
                }
                
                // 메인 재료 섹션으로 스크롤
                if (mainForm) {
                  mainForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                return; // 선택 막기
              }
            } else if (specialInfo === 'special:cheese') {
              // 치즈가 선택되었는지 확인 (선택 안함 제외)
              const cheeseRadio = detailPage.querySelector('[data-radio-group="cheese"] .radio.is-selected');
              
              if (!cheeseRadio) {
                // 토스트 표시
                if (window.showToast) {
                  window.showToast({
                    en: 'Please select a cheese option first',
                    kr: '치즈 옵션을 먼저 선택해주세요'
                  });
                }
                
                // 치즈 섹션으로 스크롤
                const cheeseForm = detailPage.querySelector('[data-radio-group="cheese"]');
                if (cheeseForm) {
                  cheeseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                return; // 선택 막기
              }
              
              // 선택 안함인지 확인
              const cheeseText = cheeseRadio.querySelector('.radio__text');
              if (cheeseText) {
                const cheeseTextContent = cheeseText.textContent.trim();
                // "선택 안함" 또는 "None"인 경우
                if (cheeseTextContent === '선택 안함' || cheeseTextContent === 'None') {
                  // 토스트 표시
                  if (window.showToast) {
                    window.showToast({
                      en: 'Please select a cheese option first',
                      kr: '치즈 옵션을 먼저 선택해주세요'
                    });
                  }
                  
                  // 치즈 섹션으로 스크롤
                  const cheeseForm = detailPage.querySelector('[data-radio-group="cheese"]');
                  if (cheeseForm) {
                    cheeseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                  
                  return; // 선택 막기
                }
              }
            }
          }
          
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
  
  // 칼로리 총합 계산 함수 (전역에서 접근 가능하도록 init 밖으로 이동)
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
          totalCalories += cheeseCalories;
          return;
        } else if (specialInfo === 'special:main') {
          const mainCalories = getSelectedMainCalories();
          totalCalories += mainCalories;
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
  
  // 선택 상태 확인 함수
  function hasAnySelection() {
    const detailPage = document.getElementById('detailPage');
    if (!detailPage) return false;
    
    // checkbox 선택 확인
    const selectedCheckboxes = detailPage.querySelectorAll('.checkbox.is-selected');
    if (selectedCheckboxes.length > 0) return true;
    
    // radio 선택 확인
    const selectedRadios = detailPage.querySelectorAll('.radio.is-selected');
    if (selectedRadios.length > 0) return true;
    
    // select 선택 확인
    const selects = detailPage.querySelectorAll('.select select');
    for (let i = 0; i < selects.length; i++) {
      if (selects[i].value && selects[i].value !== '') {
        return true;
      }
    }
    
    return false;
  }
  
  
  // 모든 선택 초기화 함수
  function resetAllSelections() {
    const detailPage = document.getElementById('detailPage');
    if (!detailPage) return;
    
    // 모든 checkbox 선택 해제
    const checkboxes = detailPage.querySelectorAll('.checkbox.is-selected');
    checkboxes.forEach(checkbox => {
      checkbox.classList.remove('is-selected');
    });
    
    // 모든 radio 선택 해제
    const radios = detailPage.querySelectorAll('.radio.is-selected');
    radios.forEach(radio => {
      radio.classList.remove('is-selected');
    });
    
    // 모든 select 초기화
    const selects = detailPage.querySelectorAll('.select select');
    selects.forEach(select => {
      select.value = '';
    });
    
    // 칼로리 재계산
    calculateTotalCalories();
    
    // 영양 정보 초기화
    const totalProtein = document.getElementById('totalProtein');
    const totalSugars = document.getElementById('totalSugars');
    const totalSodium = document.getElementById('totalSodium');
    const totalSaturatedFat = document.getElementById('totalSaturatedFat');
    
    if (totalProtein) totalProtein.textContent = '0 g';
    if (totalSugars) totalSugars.textContent = '0 g';
    if (totalSodium) totalSodium.textContent = '0 g';
    if (totalSaturatedFat) totalSaturatedFat.textContent = '0 g';
  }
  
  // 초기화 버튼 이벤트
  function initResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;
    
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 선택한 옵션이 없으면 토스트 표시
      if (!hasAnySelection()) {
        if (window.showToast) {
          window.showToast({
            en: 'No options selected',
            kr: '선택한 옵션이 없습니다'
          });
        }
        return;
      }
      
      // 공통 모달 컴포넌트 사용
      if (window.showModal) {
        window.showModal({
          id: 'resetModal',
          title: { en: 'Do you want to delete<br>all selected options?', kr: '선택한 모든 옵션을 삭제할까요?' },
          cancelText: { en: 'Close', kr: '닫기' },
          confirmText: { en: 'Delete', kr: '삭제하기' },
          confirmClass: 'delete',
          onCancel: () => {
            // 취소 시 아무것도 하지 않음
          },
          onConfirm: () => {
            // 확인 시 모든 선택 초기화
            resetAllSelections();
          }
        });
      } else {
        // 모달 컴포넌트가 없으면 바로 초기화
        resetAllSelections();
      }
    });
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
        const resultBottom = resultRect.bottom;
        // result 하단에 바로 붙이기 (간격 0)
        nutritionInfo.style.top = `${resultBottom}px`;
        nutritionInfo.style.marginTop = '0';
      }
    }
    
    // nutrition-info 닫기 함수
    function closeNutritionInfo() {
      nutritionInfo.style.display = 'none';
      // 언어에 맞는 텍스트 설정
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      const detailText = currentLang === 'kr' ? '상세보기' : 'Details';
      detailBtn.textContent = detailText;
      // i18n 시스템 업데이트
      if (window.refreshLanguage) {
        setTimeout(() => {
          window.refreshLanguage();
        }, 0);
      }
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
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      
      if (nutritionInfo.style.display === 'none') {
        nutritionInfo.style.display = 'block';
        // 언어에 맞는 텍스트 설정 (간략히)
        const briefText = currentLang === 'kr' ? '간략히' : 'Hide';
        detailBtn.textContent = briefText;
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
  
  // totalTitle 반응형 텍스트 처리
  function initResponsiveTitle() {
    const totalTitle = document.querySelector('.totalTitle');
    if (!totalTitle) return;
    
    let isUpdating = false; // 업데이트 중 플래그로 무한 루프 방지
    
    function updateTitleText() {
      if (isUpdating) return;
      isUpdating = true;
      
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      
      // 화면 너비 측정
      const screenWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      const shouldUseShort = screenWidth <= 380;
      
      if (shouldUseShort) {
        // 380px 이하면 짧은 텍스트 사용
        const shortText = currentLang === 'kr' 
          ? totalTitle.getAttribute('data-i18n-kr-short') || '총합'
          : totalTitle.getAttribute('data-i18n-en-short') || 'Total';
        totalTitle.textContent = shortText;
      } else {
        // 380px 초과면 전체 텍스트 사용
        const fullText = currentLang === 'kr'
          ? totalTitle.getAttribute('data-i18n-kr') || '칼로리 총합'
          : totalTitle.getAttribute('data-i18n-en') || 'Total Calories';
        totalTitle.textContent = fullText;
      }
      
      isUpdating = false;
    }
    
    // i18n 시스템의 refreshLanguage 후킹
    const originalRefreshLanguage = window.refreshLanguage;
    if (originalRefreshLanguage) {
      window.refreshLanguage = function() {
        originalRefreshLanguage();
        setTimeout(updateTitleText, 100);
      };
    }
    
    // 초기 실행 (약간의 지연 필요)
    setTimeout(() => {
      updateTitleText();
    }, 200);
    
    // 리사이즈 이벤트 리스너
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateTitleText, 150);
    });
    
    // 언어 변경 시에도 업데이트
    const originalSetLanguage = window.setLanguage;
    if (originalSetLanguage) {
      window.setLanguage = function(lang) {
        originalSetLanguage(lang);
        setTimeout(updateTitleText, 150);
      };
    }
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
  
  
  // 광고 초기화 함수 (Instagram과 동일한 크기)
  function initAds() {
    const ins = document.querySelector('.footer .adsbygoogle');
    if (!ins) return;
    
    const BP = 430; // 화면 너비 임계값
    const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    
    let width, height;
    if (w <= BP) {
      // 모바일: 폭 100%로 두고 높이 80px
      width = '100%';
      height = 100;
    } else {
      // 데스크톱: 430x80
      width = 430;
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
  
  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initDetailToggle();
      initResetButton();
      initResponsiveTitle();
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
    initDetailToggle();
    initResetButton();
    initResponsiveTitle();
    // header 높이 설정 (렌더링 후)
    setTimeout(() => {
      setCSSHeaderH();
      initAds();
      initSideRailAds();
      // 리사이즈 시 header 높이 재계산
      window.addEventListener('resize', setCSSHeaderH);
    }, 100);
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
  
  // 리사이즈 시 사이드 레일 광고 재초기화
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) {
      initSideRailAds();
    }
  });
})();
  