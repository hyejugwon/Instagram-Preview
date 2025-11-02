// ingredients 데이터를 동적으로 렌더링하는 함수
(function() {
  'use strict';
  
  // 전역에서 접근 가능하도록 window에 등록
  window.renderIngredients = function(container) {
    return fetch('/services/subway/ingredients-data.json')
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
          formTitle.textContent = form.title;
          formHeader.appendChild(formTitle);
          
          if (form.description) {
            const description = document.createElement('span');
            description.className = 'description b1--R kr';
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
            select.setAttribute('aria-placeholder', '선택');
            
            // 기본 "선택" 옵션
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '선택';
            select.appendChild(defaultOption);
            
            // form.options가 있으면 옵션 추가
            if (form.options && form.options.length > 0) {
              form.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.text;
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
              <img src="/icons/down.svg" alt="" class="select__icon--down">
              <img src="/icons/up.svg" alt="" class="select__icon--up">
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
              
              radio.innerHTML = `
                <div class="radio__icon">
                  <img src="/icons/radioEmpty.svg" alt="" class="radio__icon--empty">
                  <img src="/icons/radioFill.svg" alt="" class="radio__icon--fill">
                </div>
                <div class="${contentClass}">
                  <span class="radio__text kr">${option.text}</span>
                  ${option.info ? `<span class="radio__info">${option.info}</span>` : ''}
                </div>
              `;
              
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
                sideTitle.innerHTML = `<span class="kr b1--M">${group.title}</span>`;
                sideDiv.appendChild(sideTitle);
                
                const layout = form.layout || 'vertical';
                const contentClass = layout === 'horizontal' ? 'checkbox__content checkbox__content--horizontal' : 'checkbox__content';
                
                group.options.forEach(option => {
                  const checkbox = document.createElement('span');
                  checkbox.className = 'checkbox check';
                  
                  if (option.info) {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="">
                      </div>
                      <div class="${contentClass}">
                        <span class="checkbox__text kr">${option.text}</span>
                        <span class="checkbox__info">${option.info}</span>
                      </div>
                    `;
                  } else {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="">
                      </div>
                      <span class="checkbox__text kr">${option.text}</span>
                    `;
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
                
                // special:로 시작하는 info는 화면에 표시하지 않음
                const shouldShowInfo = option.info && !option.info.startsWith('special:');
                
                if (shouldShowInfo) {
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="/icons/circleCheck.svg" alt="">
                    </div>
                    <div class="${contentClass}">
                      <span class="checkbox__text kr">${option.text}</span>
                      <span class="checkbox__info">${option.info}</span>
                    </div>
                  `;
                } else if (option.info && option.info.startsWith('special:')) {
                  // special:인 경우 info는 숨기지만 data 속성으로 저장 (칼로리 계산용)
                  const iconPath = '/icons/circleCheck.svg';
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="${iconPath}" alt="">
                    </div>
                    <span class="checkbox__text kr">${option.text}</span>
                  `;
                  checkbox.setAttribute('data-special-info', option.info);
                } else {
                  const iconPath = '/icons/circleCheck.svg';
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="${iconPath}" alt="">
                    </div>
                    <span class="checkbox__text kr">${option.text}</span>
                  `;
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

