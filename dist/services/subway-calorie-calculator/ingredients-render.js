// ingredients 데이터를 동적으로 렌더링하는 함수
(function() {
  'use strict';
  
  // 기본 번역 맵
  const translations = {
    '메인 재료': { en: 'Main Ingredient', kr: '메인 재료' },
    '빵': { en: 'Bread', kr: '빵' },
    '야채': { en: 'Vegetables', kr: '야채' },
    '치즈': { en: 'Cheese', kr: '치즈' },
    '소스': { en: 'Sauce', kr: '소스' },
    '토핑': { en: 'Topping', kr: '토핑' },
    '추가 메뉴': { en: 'Additional Menu', kr: '추가 메뉴' },
    '쿠키': { en: 'Cookie', kr: '쿠키' },
    '사이드': { en: 'Side', kr: '사이드' },
    '(중복선택)': { en: '(Multiple selection)', kr: '(중복선택)' },
    '(중복선택, 14g 기준)': { en: '(Multiple selection, 14g)', kr: '(중복선택, 14g 기준)' },
    '선택': { en: 'Select', kr: '선택' },
    '선택 안함': { en: 'None', kr: '선택 안함' },
    // 빵 옵션
    '하티': { en: 'Hearty', kr: '하티' },
    '허니오트': { en: 'Honey Oat', kr: '허니오트' },
    '화이트': { en: 'White', kr: '화이트' },
    '파마산 오레가노': { en: 'Parmesan Oregano', kr: '파마산 오레가노' },
    '플랫브레드': { en: 'Flatbread', kr: '플랫브레드' },
    '위트': { en: 'Wheat', kr: '위트' },
    // 치즈 옵션
    '모짜렐라 치즈': { en: 'Mozzarella Cheese', kr: '모짜렐라 치즈' },
    '슈레드 치즈': { en: 'Shredded Cheese', kr: '슈레드 치즈' },
    '아메리칸 치즈': { en: 'American Cheese', kr: '아메리칸 치즈' },
    // 야채 옵션
    '양상추': { en: 'Lettuce', kr: '양상추' },
    '토마토': { en: 'Tomato', kr: '토마토' },
    '오이': { en: 'Cucumber', kr: '오이' },
    '피망': { en: 'Bell Pepper', kr: '피망' },
    '양파': { en: 'Onion', kr: '양파' },
    '올리브': { en: 'Olives', kr: '올리브' },
    '할라피뇨': { en: 'Jalapeño', kr: '할라피뇨' },
    '피클': { en: 'Pickles', kr: '피클' },
    '아보카도': { en: 'Avocado', kr: '아보카도' },
    // 소스 옵션
    '소금 & 후추': { en: 'Salt & Pepper', kr: '소금 & 후추' },
    '레드 와인 식초': { en: 'Red Wine Vinegar', kr: '레드 와인 식초' },
    '랜치': { en: 'Ranch', kr: '랜치' },
    '마요네즈': { en: 'Mayonnaise', kr: '마요네즈' },
    '머스타드': { en: 'Mustard', kr: '머스타드' },
    '사우스웨스트 치폴레': { en: 'Southwest Chipotle', kr: '사우스웨스트 치폴레' },
    '스모크 바비큐': { en: 'Smoky BBQ', kr: '스모크 바비큐' },
    '스모크 치폴레': { en: 'Smoky Chipotle', kr: '스모크 치폴레' },
    '스위트 어니언': { en: 'Sweet Onion', kr: '스위트 어니언' },
    '스위트 칠리': { en: 'Sweet Chili', kr: '스위트 칠리' },
    '올리브 오일': { en: 'Olive Oil', kr: '올리브 오일' },
    '이탈리안 드레싱': { en: 'Italian Dressing', kr: '이탈리안 드레싱' },
    '엑스트라 버진 올리브 오일': { en: 'Extra Virgin Olive Oil', kr: '엑스트라 버진 올리브 오일' },
    '허니 머스타드': { en: 'Honey Mustard', kr: '허니 머스타드' },
    '홀스래디쉬': { en: 'Horseradish', kr: '홀스래디쉬' },
    // 토핑 옵션
    '베이컨': { en: 'Bacon', kr: '베이컨' },
    '에그 슬라이스': { en: 'Egg Slice', kr: '에그 슬라이스' },
    '에그마요': { en: 'Egg Mayo', kr: '에그마요' },
    '오믈렛': { en: 'Omelet', kr: '오믈렛' },
    '페퍼로니': { en: 'Pepperoni', kr: '페퍼로니' },
    '치즈(동일 치즈)': { en: 'Cheese (Same Cheese)', kr: '치즈(동일 치즈)' },
    '고기 추가': { en: 'Extra Meat', kr: '고기 추가' },
    // 추가 메뉴 - 쿠키
    '라즈베리 치즈 케이크': { en: 'Raspberry Cheesecake', kr: '라즈베리 치즈 케이크' },
    '더블 초코칩': { en: 'Double Chocolate Chip', kr: '더블 초코칩' },
    '오트밀 레이즌': { en: 'Oatmeal Raisin', kr: '오트밀 레이즌' },
    '초코칩': { en: 'Chocolate Chip', kr: '초코칩' },
    '화이트 마카다미아': { en: 'White Macadamia', kr: '화이트 마카다미아' },
    // 추가 메뉴 - 사이드
    'Bacon Cheesy 웨지 포테이토': { en: 'Bacon Cheesy Wedge Potato', kr: 'Bacon Cheesy 웨지 포테이토' },
    'Cheesy 웨지 포테이토': { en: 'Cheesy Wedge Potato', kr: 'Cheesy 웨지 포테이토' },
    '머쉬룸 수프 하프': { en: 'Mushroom Soup Half', kr: '머쉬룸 수프 하프' },
    '머쉬룸 수프 레귤러': { en: 'Mushroom Soup Regular', kr: '머쉬룸 수프 레귤러' },
    '콘 수프 하프': { en: 'Corn Soup Half', kr: '콘 수프 하프' },
    '콘 수프 레귤러': { en: 'Corn Soup Regular', kr: '콘 수프 레귤러' },
    '웨지 포테이토': { en: 'Wedge Potato', kr: '웨지 포테이토' },
    // 메인 재료 옵션 (일부는 영어 그대로)
    'K-바비큐': { en: 'K-BBQ', kr: 'K-바비큐' },
    '베지': { en: 'Veggie', kr: '베지' },
    '로스트 비프': { en: 'Roast Beef', kr: '로스트 비프' },
    '로스트 치킨': { en: 'Roast Chicken', kr: '로스트 치킨' },
    '로티세리 바비큐 치킨': { en: 'Rotisserie BBQ Chicken', kr: '로티세리 바비큐 치킨' },
    '미트볼': { en: 'Meatball', kr: '미트볼' },
    '머쉬룸': { en: 'Mushroom', kr: '머쉬룸' },
    '스테이크': { en: 'Steak', kr: '스테이크' },
    '스테이크 & 치즈': { en: 'Steak & Cheese', kr: '스테이크 & 치즈' },
    '스파이시 쉬림프': { en: 'Spicy Shrimp', kr: '스파이시 쉬림프' },
    '스파이시 이탈리안': { en: 'Spicy Italian', kr: '스파이시 이탈리안' },
    '쉬림프': { en: 'Shrimp', kr: '쉬림프' },
    '써브웨이 클럽': { en: 'Subway Club', kr: '써브웨이 클럽' },
    '안창 비프': { en: 'Angus Beef', kr: '안창 비프' },
    '안창 비프&머쉬룸': { en: 'Angus Beef & Mushroom', kr: '안창 비프&머쉬룸' },
    '이탈리안 비엠티': { en: 'Italian BMT', kr: '이탈리안 비엠티' },
    '참치': { en: 'Tuna', kr: '참치' },
    '치킨': { en: 'Chicken', kr: '치킨' },
    '치킨 데리야끼': { en: 'Chicken Teriyaki', kr: '치킨 데리야끼' },
    '터키': { en: 'Turkey', kr: '터키' },
    '터키 베이컨 아보카도': { en: 'Turkey Bacon Avocado', kr: '터키 베이컨 아보카도' },
    '터키 베이컨 에그 슬라이스': { en: 'Turkey Bacon Egg Slice', kr: '터키 베이컨 에그 슬라이스' },
    '풀드 포크 바비큐!': { en: 'Pulled Pork BBQ!', kr: '풀드 포크 바비큐!' },
    '햄': { en: 'Ham', kr: '햄' }
  };
  
  // 번역 함수
  function getTranslation(key, lang) {
    const translation = translations[key];
    if (translation) {
      return translation[lang] || key;
    }
    return key;
  }
  
  // 전역에서 접근 가능하도록 window에 등록
  window.renderIngredients = function(container) {
    return fetch('/services/subway-calorie-calculator/ingredients-data.json')
      .then(res => res.json())
      .then(data => {
        const selecArea = container || document.querySelector('.selecArea');
        if (!selecArea) {
          console.error('selecArea not found');
          return;
        }
        
        // 기존 내용 제거
        selecArea.innerHTML = '';
        
        data.forms.forEach(form => {
          const formDiv = document.createElement('div');
          formDiv.className = 'form';
          formDiv.setAttribute('id', form.id);
          formDiv.setAttribute('data-form-id', form.id);
          if (form.field) {
            formDiv.setAttribute('data-field', form.field);
          }
          
          // formHeader 생성
          const formHeader = document.createElement('div');
          formHeader.className = 'formHeader';
          
          const formTitle = document.createElement('span');
          formTitle.className = 'formTitle b1--M kr';
          formTitle.setAttribute('data-i18n-en', getTranslation(form.title, 'en'));
          formTitle.setAttribute('data-i18n-kr', getTranslation(form.title, 'kr'));
          formTitle.textContent = form.title;
          formHeader.appendChild(formTitle);
          
          if (form.description) {
            const description = document.createElement('span');
            description.className = 'description b1--R kr';
            description.setAttribute('data-i18n-en', getTranslation(form.description, 'en'));
            description.setAttribute('data-i18n-kr', getTranslation(form.description, 'kr'));
            description.textContent = form.description;
            formHeader.appendChild(description);
          }
          
          formDiv.appendChild(formHeader);
          
          // 타입에 따라 다른 렌더링
          if (form.type === 'select') {
            const selectDiv = document.createElement('div');
            selectDiv.className = 'select';
            
            const select = document.createElement('select');
            select.className = 'b1--R kr';
            const selectText = getTranslation('선택', 'kr');
            select.setAttribute('aria-placeholder', selectText);
            
            // 기본 "선택" 옵션
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.setAttribute('data-i18n-en', getTranslation('선택', 'en'));
            defaultOption.setAttribute('data-i18n-kr', getTranslation('선택', 'kr'));
            defaultOption.textContent = selectText;
            select.appendChild(defaultOption);
            
            // form.options가 있으면 옵션 추가
            if (form.options && form.options.length > 0) {
              form.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.text;
                // 모든 옵션 텍스트에 i18n 속성 추가
                optionElement.setAttribute('data-i18n-en', getTranslation(option.text, 'en') + (option.info ? ` (${option.info})` : ''));
                optionElement.setAttribute('data-i18n-kr', getTranslation(option.text, 'kr') + (option.info ? ` (${option.info})` : ''));
                if (option.info) {
                  optionElement.textContent = `${option.text} (${option.info})`;
                } else {
                  optionElement.textContent = option.text;
                }
                optionElement.setAttribute('data-info', option.info || '');
                select.appendChild(optionElement);
              });
            }
            
            selectDiv.appendChild(select);
            
            const selectIcon = document.createElement('div');
            selectIcon.className = 'select__icon';
            selectIcon.innerHTML = `
              <img src="/icons/down.svg" alt="Dropdown" class="select__icon--down">
              <img src="/icons/up.svg" alt="Dropdown" class="select__icon--up">
            `;
            selectDiv.appendChild(selectIcon);
            
            formDiv.appendChild(selectDiv);
          } else if (form.type === 'radio') {
            const doubleSelect = document.createElement('div');
            doubleSelect.className = 'doubleSelect';
            doubleSelect.setAttribute('data-radio-group', form.id);
            
            const layout = form.layout || 'vertical';
            const contentClass = layout === 'horizontal' ? 'radio__content radio__content--horizontal' : 'radio__content';
            
            form.options.forEach(option => {
              const radio = document.createElement('span');
              radio.className = 'radio check';
              
              const radioText = document.createElement('span');
              radioText.className = 'radio__text kr';
              // 모든 옵션 텍스트에 i18n 속성 추가
              radioText.setAttribute('data-i18n-en', getTranslation(option.text, 'en'));
              radioText.setAttribute('data-i18n-kr', getTranslation(option.text, 'kr'));
              radioText.textContent = option.text;
              
              radio.innerHTML = `
                <div class="radio__icon">
                  <img src="/icons/radioEmpty.svg" alt="Radio button" class="radio__icon--empty">
                  <img src="/icons/radioFill.svg" alt="Radio button selected" class="radio__icon--fill">
                </div>
                <div class="${contentClass}">
                  ${option.info ? `<span class="radio__info">${option.info}</span>` : ''}
                </div>
              `;
              
              const contentDiv = radio.querySelector(`.${contentClass}`);
              if (contentDiv) {
                contentDiv.insertBefore(radioText, contentDiv.firstChild);
              }
              
              doubleSelect.appendChild(radio);
            });
            
            formDiv.appendChild(doubleSelect);
          } else if (form.type === 'checkbox') {
            const doubleSelect = document.createElement('div');
            doubleSelect.className = 'doubleSelect';
            
            if (form.groups) {
              // 그룹이 있는 경우 (추가 메뉴)
              form.groups.forEach(group => {
                const sideDiv = document.createElement('div');
                sideDiv.className = 'side';
                
                const sideTitle = document.createElement('div');
                sideTitle.className = 'sideTitle';
                const sideTitleSpan = document.createElement('span');
                sideTitleSpan.className = 'kr b1--M';
                sideTitleSpan.setAttribute('data-i18n-en', getTranslation(group.title, 'en'));
                sideTitleSpan.setAttribute('data-i18n-kr', getTranslation(group.title, 'kr'));
                sideTitleSpan.textContent = group.title;
                sideTitle.appendChild(sideTitleSpan);
                sideDiv.appendChild(sideTitle);
                
                const layout = form.layout || 'vertical';
                const contentClass = layout === 'horizontal' ? 'checkbox__content checkbox__content--horizontal' : 'checkbox__content';
                
                group.options.forEach(option => {
                  const checkbox = document.createElement('span');
                  checkbox.className = 'checkbox check';
                  
                  const checkboxText = document.createElement('span');
                  checkboxText.className = 'checkbox__text kr';
                  // 모든 옵션 텍스트에 i18n 속성 추가
                  checkboxText.setAttribute('data-i18n-en', getTranslation(option.text, 'en'));
                  checkboxText.setAttribute('data-i18n-kr', getTranslation(option.text, 'kr'));
                  checkboxText.textContent = option.text;
                  
                  if (option.info) {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="Checkbox">
                      </div>
                      <div class="${contentClass}">
                        <span class="checkbox__info">${option.info}</span>
                      </div>
                    `;
                    const contentDiv = checkbox.querySelector(`.${contentClass}`);
                    if (contentDiv) {
                      contentDiv.insertBefore(checkboxText, contentDiv.firstChild);
                    }
                  } else {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="Checkbox">
                      </div>
                    `;
                    checkbox.appendChild(checkboxText);
                  }
                  
                  sideDiv.appendChild(checkbox);
                });
                
                doubleSelect.appendChild(sideDiv);
              });
            } else {
              // 그룹이 없는 경우
              form.options.forEach(option => {
                const checkbox = document.createElement('span');
                checkbox.className = 'checkbox check';
                
                const layout = form.layout || 'vertical';
                const contentClass = layout === 'horizontal' ? 'checkbox__content checkbox__content--horizontal' : 'checkbox__content';
                
                // checkbox 텍스트 요소 생성
                const checkboxText = document.createElement('span');
                checkboxText.className = 'checkbox__text kr';
                // 모든 옵션 텍스트에 i18n 속성 추가
                checkboxText.setAttribute('data-i18n-en', getTranslation(option.text, 'en'));
                checkboxText.setAttribute('data-i18n-kr', getTranslation(option.text, 'kr'));
                checkboxText.textContent = option.text;
                
                // special:로 시작하는 info는 화면에 표시하지 않음
                const shouldShowInfo = option.info && !option.info.startsWith('special:');
                
                if (shouldShowInfo) {
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="/icons/circleCheck.svg" alt="Checkbox">
                    </div>
                    <div class="${contentClass}">
                      <span class="checkbox__info">${option.info}</span>
                    </div>
                  `;
                  const contentDiv = checkbox.querySelector(`.${contentClass}`);
                  if (contentDiv) {
                    contentDiv.insertBefore(checkboxText, contentDiv.firstChild);
                  }
                } else if (option.info && option.info.startsWith('special:')) {
                  // special:인 경우 info는 숨기지만 data 속성으로 저장 (칼로리 계산용)
                  const iconPath = '/icons/circleCheck.svg';
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="${iconPath}" alt="Checkbox">
                    </div>
                  `;
                  checkbox.appendChild(checkboxText);
                  checkbox.setAttribute('data-special-info', option.info);
                } else {
                  const iconPath = '/icons/circleCheck.svg';
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="${iconPath}" alt="Checkbox">
                    </div>
                  `;
                  checkbox.appendChild(checkboxText);
                }
                
                doubleSelect.appendChild(checkbox);
              });
            }
            
            formDiv.appendChild(doubleSelect);
          }
          
          selecArea.appendChild(formDiv);
        });
        
        // 정보 카드 추가는 subway.js에서 처리
        // ingredients.html이 index.html에 통합되었으므로 여기서는 추가하지 않음
        
        // i18n 시스템 새로고침 (동적으로 생성된 요소에 언어 적용)
        if (window.refreshLanguage) {
          setTimeout(() => {
            window.refreshLanguage();
          }, 0);
        }
        
        return Promise.resolve();
      })
      .catch(err => {
        console.error('Failed to load ingredients data:', err);
        return Promise.reject(err);
      });
  }
  
  // DOM 로드 후 렌더링 (index.html에서 직접 호출)
  // ingredients.html은 index.html에 통합되었으므로 별도 처리 불필요
})();

