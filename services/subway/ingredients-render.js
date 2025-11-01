// ingredients 데이터를 읽어서 동적으로 렌더링
(function () {
  async function renderIngredients(container) {
    if (!container) {
      console.error('Container not found');
      return Promise.resolve();
    }
    
    try {
      const response = await fetch('/services/subway/ingredients-data.json');
      const data = await response.json();
      
      data.forms.forEach(form => {
        const formDiv = document.createElement('div');
        formDiv.className = 'form';
        formDiv.id = form.id;
        formDiv.setAttribute('data-form-id', form.id);
        
        // formHeader 생성
        if (form.title || form.description) {
          const formHeader = document.createElement('div');
          formHeader.className = 'formHeader';
          
          if (form.title) {
            const formTitle = document.createElement('div');
            formTitle.className = 'formTitle kr';
            formTitle.textContent = form.title;
            formHeader.appendChild(formTitle);
          }
          
          if (form.description) {
            const description = document.createElement('span');
            description.className = 'description kr';
            description.textContent = form.description;
            formHeader.appendChild(description);
          }
          
          formDiv.appendChild(formHeader);
        }
        
        // select 타입
        if (form.type === 'select') {
          const selectWrapper = document.createElement('div');
          selectWrapper.className = 'select';
          
          const select = document.createElement('select');
          form.options.forEach((option, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = index;
            if (option.info) {
              optionElement.textContent = `${option.text} - ${option.info}`;
            } else {
              optionElement.textContent = option.text;
            }
            select.appendChild(optionElement);
          });
          
          const iconWrapper = document.createElement('div');
          iconWrapper.className = 'select__icon';
          iconWrapper.innerHTML = `
            <img src="/icons/down.svg" alt="" class="select__icon--down" width="18" height="18">
            <img src="/icons/up.svg" alt="" class="select__icon--up" style="display: none;" width="18" height="18">
          `;
          
          select.addEventListener('focus', () => {
            selectWrapper.classList.add('is-open');
            iconWrapper.querySelector('.select__icon--down').style.display = 'none';
            iconWrapper.querySelector('.select__icon--up').style.display = 'block';
          });
          
          select.addEventListener('blur', () => {
            selectWrapper.classList.remove('is-open');
            iconWrapper.querySelector('.select__icon--down').style.display = 'block';
            iconWrapper.querySelector('.select__icon--up').style.display = 'none';
          });
          
          selectWrapper.appendChild(select);
          selectWrapper.appendChild(iconWrapper);
          formDiv.appendChild(selectWrapper);
        }
        // checkbox/radio 타입
        else if (form.type === 'checkbox' || form.type === 'radio') {
          const doubleSelect = document.createElement('div');
          doubleSelect.className = 'doubleSelect';
          
          // 그룹이 있는 경우 (추가 메뉴)
          if (form.groups) {
            form.groups.forEach(group => {
              const sideDiv = document.createElement('div');
              sideDiv.className = 'side';
              
              const sideTitle = document.createElement('div');
              sideTitle.className = 'sideTitle kr';
              sideTitle.textContent = group.title;
              sideDiv.appendChild(sideTitle);
              
              group.options.forEach(option => {
                const checkbox = document.createElement('div');
                checkbox.className = form.type === 'checkbox' ? 'checkbox' : 'radio';
                
                const contentClass = form.layout === 'horizontal' 
                  ? (form.type === 'checkbox' ? 'checkbox__content checkbox__content--horizontal' : 'radio__content radio__content--horizontal')
                  : (form.type === 'checkbox' ? 'checkbox__content' : 'radio__content');
                
                // special:로 시작하는 info는 화면에 표시하지 않음
                const shouldShowInfo = option.info && !option.info.startsWith('special:');
                
                if (shouldShowInfo) {
                  if (form.type === 'checkbox') {
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
                      <div class="radio__icon">
                        <img src="/icons/radioEmpty.svg" alt="">
                      </div>
                      <div class="${contentClass}">
                        <span class="radio__text kr">${option.text}</span>
                        <span class="radio__info">${option.info}</span>
                      </div>
                    `;
                  }
                } else if (option.info && option.info.startsWith('special:')) {
                  // special:인 경우 info는 숨기지만 data 속성으로 저장 (칼로리 계산용)
                  if (form.type === 'checkbox') {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="">
                      </div>
                      <span class="checkbox__text kr">${option.text}</span>
                    `;
                  } else {
                    checkbox.innerHTML = `
                      <div class="radio__icon">
                        <img src="/icons/radioEmpty.svg" alt="">
                      </div>
                      <span class="radio__text kr">${option.text}</span>
                    `;
                  }
                  checkbox.setAttribute('data-special-info', option.info);
                } else {
                  if (form.type === 'checkbox') {
                    checkbox.innerHTML = `
                      <div class="checkbox__icon">
                        <img src="/icons/circleCheck.svg" alt="">
                      </div>
                      <span class="checkbox__text kr">${option.text}</span>
                    `;
                  } else {
                    checkbox.innerHTML = `
                      <div class="radio__icon">
                        <img src="/icons/radioEmpty.svg" alt="">
                      </div>
                      <span class="radio__text kr">${option.text}</span>
                    `;
                  }
                }
                
                if (form.type === 'checkbox' && form.layout === 'vertical') {
                  sideDiv.appendChild(checkbox);
                } else {
                  doubleSelect.appendChild(checkbox);
                }
              });
              
              if (form.type === 'checkbox' && form.layout === 'vertical') {
                doubleSelect.appendChild(sideDiv);
              }
            });
          }
          // 그룹이 없는 경우
          else {
            form.options.forEach(option => {
              const checkbox = document.createElement('div');
              checkbox.className = form.type === 'checkbox' ? 'checkbox' : 'radio';
              
              const contentClass = form.layout === 'horizontal' 
                ? (form.type === 'checkbox' ? 'checkbox__content checkbox__content--horizontal' : 'radio__content radio__content--horizontal')
                : (form.type === 'checkbox' ? 'checkbox__content' : 'radio__content');
              
              // special:로 시작하는 info는 화면에 표시하지 않음
              const shouldShowInfo = option.info && !option.info.startsWith('special:');
              
              if (shouldShowInfo) {
                if (form.type === 'checkbox') {
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
                    <div class="radio__icon">
                      <img src="/icons/radioEmpty.svg" alt="">
                    </div>
                    <div class="${contentClass}">
                      <span class="radio__text kr">${option.text}</span>
                      <span class="radio__info">${option.info}</span>
                    </div>
                  `;
                }
              } else if (option.info && option.info.startsWith('special:')) {
                if (form.type === 'checkbox') {
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="/icons/circleCheck.svg" alt="">
                    </div>
                    <span class="checkbox__text kr">${option.text}</span>
                  `;
                } else {
                  checkbox.innerHTML = `
                    <div class="radio__icon">
                      <img src="/icons/radioEmpty.svg" alt="">
                    </div>
                    <span class="radio__text kr">${option.text}</span>
                  `;
                }
                checkbox.setAttribute('data-special-info', option.info);
              } else {
                if (form.type === 'checkbox') {
                  checkbox.innerHTML = `
                    <div class="checkbox__icon">
                      <img src="/icons/circleCheck.svg" alt="">
                    </div>
                    <span class="checkbox__text kr">${option.text}</span>
                  `;
                } else {
                  checkbox.innerHTML = `
                    <div class="radio__icon">
                      <img src="/icons/radioEmpty.svg" alt="">
                    </div>
                    <span class="radio__text kr">${option.text}</span>
                  `;
                }
              }
              
              doubleSelect.appendChild(checkbox);
            });
          }
          
          formDiv.appendChild(doubleSelect);
        }
        
        container.appendChild(formDiv);
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load ingredients data:', error);
      return Promise.reject(error);
    }
  }
  
  // 전역 함수로 등록
  window.renderIngredients = renderIngredients;
})();

