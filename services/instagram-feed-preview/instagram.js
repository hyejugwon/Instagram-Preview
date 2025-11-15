(function () {
    // ===== DOM =====
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const fileInput = document.getElementById('fileInput');
    const grid = document.getElementById('grid');
    // 모달은 공통 컴포넌트 사용 (js/modal.js)
    const adOverlay = document.getElementById('adOverlay');
    const closeAd = document.getElementById('closeAd');
    const dragGhost = document.getElementById('dragGhost');
    const app = document.querySelector('.app');
    const contentsArea = document.querySelector('.contentsArea');
    const emptyGuide = document.getElementById('emptyGuide');
  
    // === Global guards: drag / copy / select / contextmenu OFF ===
    ['dragstart', 'selectstart', 'contextmenu', 'copy', 'cut', 'paste'].forEach(type => {
      document.addEventListener(type, (e) => {
        e.preventDefault();
      }, { passive: false });
    });
  
    // ===== State =====
    let editMode = false;
    let targetForDelete = null;
    let targetForReplace = null; // 사진 교체 대상
    let pointerId = null;
    let dragInfo = null;
    let longPressTimer = null;
  
    // ===== Persist (IndexedDB) =====
    const DB_NAME = 'insta-preview';
    const DB_VER = 1;
    const OS_PHOTOS = 'photos';
    const OS_META = 'meta';
  
    function openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(OS_PHOTOS)) {
            db.createObjectStore(OS_PHOTOS, { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains(OS_META)) {
            db.createObjectStore(OS_META, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
  
    async function dbAddPhoto(blob) {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_PHOTOS], 'readwrite');
        const req = tx.objectStore(OS_PHOTOS).add({ blob, createdAt: Date.now() });
        req.onsuccess = () => res(req.result); // 새로 생성된 ID 반환
        req.onerror = () => rej(tx.error);
      });
    }
    
    async function dbUpdatePhotoById(id, blob) {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_PHOTOS], 'readwrite');
        const store = tx.objectStore(OS_PHOTOS);
        const getReq = store.get(id);
        
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            // 기존 데이터를 복사하고 blob만 업데이트
            const updatedData = {
              id: data.id,
              blob: blob,
              createdAt: data.createdAt // createdAt 유지
            };
            const putReq = store.put(updatedData);
            putReq.onsuccess = () => res();
            putReq.onerror = () => rej(putReq.error);
          } else {
            rej(new Error('Photo not found'));
          }
        };
        
        getReq.onerror = () => rej(getReq.error);
        tx.onerror = () => rej(tx.error);
      });
    }
  
    async function dbGetAllPhotos() {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_PHOTOS], 'readonly');
        const req = tx.objectStore(OS_PHOTOS).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    }
  
    async function dbDeletePhotoById(id) {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_PHOTOS], 'readwrite');
        tx.objectStore(OS_PHOTOS).delete(id);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    }
  
    async function dbSetOrder(orderIds) {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_META], 'readwrite');
        tx.objectStore(OS_META).put({ key: 'order', value: orderIds });
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    }
  
    async function dbGetOrder() {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction([OS_META], 'readonly');
        const req = tx.objectStore(OS_META).get('order');
        req.onsuccess = () => res(req.result?.value || []);
        req.onerror = () => rej(req.error);
      });
    }
  
    if (navigator.storage?.persist) {
      navigator.storage.persist().then(g => console.log('[persist]', g));
    }
  
    // ===== Image utils =====
    async function resizeToBlob(file, maxDim = 1440, quality = 0.85) {
      const img = await readAsImage(file);
      const { canvas, ctx, outW, outH } = makeCanvas(img, maxDim);
      ctx.drawImage(img, 0, 0, outW, outH);
      return await new Promise((res) => canvas.toBlob(b => res(b), 'image/jpeg', quality));
    }
  
    function readAsImage(file) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
      });
    }
  
    function makeCanvas(img, maxDim) {
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const outW = Math.round(w * scale), outH = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      return { canvas, ctx, outW, outH };
    }
  
    // ===== Render =====
    async function renderAll() {
      grid.innerHTML = '';
      const [photos, order] = await Promise.all([dbGetAllPhotos(), dbGetOrder()]);
  
      // order에 있는 건 뒤로 유지, 새로 추가된 건 createdAt 내림차순으로 앞으로
      const map = new Map(photos.map(p => [p.id, p]));
      const orderedBySaved = [];
      order.forEach(id => {
        if (map.has(id)) {
          orderedBySaved.push(map.get(id));
          map.delete(id);
        }
      });
  
      const newestFirst = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      const finalList = [...newestFirst, ...orderedBySaved];
  
      for (const rec of finalList) {
        grid.appendChild(createCellFromRecord(rec));
      }
  
      updateGridState();
      applyEmptyMode();
      syncHeaderPaddingToScrollbar();
      if (editBtn) editBtn.disabled = grid.children.length === 0;
    }
  
    function createCellFromRecord(rec) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.setAttribute('draggable', 'false');
      el.dataset.id = String(rec.id);
  
      const img = document.createElement('img');
      const url = URL.createObjectURL(rec.blob);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      el.appendChild(img);
  
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'handle';
      handle.setAttribute('aria-label', 'Reorder');
      handle.textContent = '≡';
      el.appendChild(handle);
  
      el.addEventListener('pointerdown', (ev) => {
        if (ev.target.closest('.handle')) return;
        onPointerDownForLongPress(ev, el);
      });
  
      handle.addEventListener('pointerdown', (ev) => onPointerDownHandle(ev, el));
      return el;
    }
  
    function getCurrentOrderIds() {
      return Array.from(grid.querySelectorAll('.cell'))
        .map(el => Number(el.dataset.id))
        .filter(n => !Number.isNaN(n));
    }
  
    async function saveCurrentOrder() {
      const ids = getCurrentOrderIds();
      await dbSetOrder(ids);
    }
  
    function updateGridState() {
      const isEmpty = grid.children.length === 0;
  
      if (isEmpty) {
        grid.classList.add('empty');
        document.body.classList.add('empty-mode');
        if (app) app.style.overflow = 'auto';
        if (editBtn) editBtn.disabled = true;
      } else {
        grid.classList.remove('empty');
        document.body.classList.remove('empty-mode');
        if (app) app.style.overflow = 'auto';
        if (editBtn) editBtn.disabled = false;
      }
      // 빈 상태 안내 표시/숨김
      if (emptyGuide) {
        if (isEmpty) {
          emptyGuide.classList.add('show');
          emptyGuide.setAttribute('aria-hidden', 'false');
        } else {
          emptyGuide.classList.remove('show');
          emptyGuide.setAttribute('aria-hidden', 'true');
        }
      }
    }
  
    function scrollAppToTop() {
      if (!app) return;
  
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
  
      const imgs = Array.from(grid.querySelectorAll('img'));
      const decodePromises = imgs.map(img => {
        if ('decode' in img) return img.decode().catch(() => {});
        if (img.complete) return Promise.resolve();
        return new Promise(res => img.addEventListener('load', res, { once: true }));
      });
  
      Promise.allSettled(decodePromises).then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try { app.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
            app.scrollTop = 0;
            document.scrollingElement && (document.scrollingElement.scrollTop = 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            // setTimeout(() => {
            //   app.scrollTop = 0;
            //   document.scrollingElement && (document.scrollingElement.scrollTop = 0);
            // }, 80);
          });
        });
      });
    }
  
    // ===== Header actions =====
    // 아이콘 템플릿 (한 번만 생성하고 clone 사용)
    const iconTemplateCheck = (() => {
      const img = document.createElement('img');
      img.src = '/icons/check.svg';
      img.alt = '';
      img.className = 'icon';
      img.width = 16;
      img.height = 16;
      return img;
    })();
    
    const iconTemplateSwitch = (() => {
      const img = document.createElement('img');
      img.src = '/icons/switch.svg';
      img.alt = '';
      img.className = 'icon';
      img.width = 16;
      img.height = 16;
      return img;
    })();
    
    function setEditMode(on) {
      editMode = on;
      document.body.classList.toggle('editing', on);
      if (addBtn) addBtn.disabled = on;
      if (editBtn) {
        // 현재 언어 가져오기
        const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
        
        // 아이콘과 텍스트 요소 생성 (clone 사용)
        const img = on ? iconTemplateCheck.cloneNode(true) : iconTemplateSwitch.cloneNode(true);
        const span = document.createElement('span');
        
        if (on) {
          // Done 버튼: priBlack 스타일
          editBtn.className = 'btn btn--fill--priBlack btn--sz-me icon--me';
          span.setAttribute('data-i18n-en', 'Done');
          span.setAttribute('data-i18n-kr', '완료');
          span.textContent = currentLang === 'kr' ? '완료' : 'Done';
        } else {
          // Edit 버튼: teriGray 스타일
          editBtn.className = 'btn btn--fill--teriGray btn--sz-me icon--me';
          span.setAttribute('data-i18n-en', 'Edit');
          span.setAttribute('data-i18n-kr', '편집');
          span.textContent = currentLang === 'kr' ? '편집' : 'Edit';
        }
        
        // replaceChildren로 안전하게 교체 (img+span 2개만 남도록)
        editBtn.replaceChildren(img, span);
        editBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        
        // 언어 번역 시스템에 새로 추가된 요소 업데이트 (마이크로태스크 지연)
        if (typeof window.refreshLanguage === 'function') {
          Promise.resolve().then(() => {
            if (typeof window.refreshLanguage === 'function') {
              window.refreshLanguage();
            }
          });
        }
      }
    }
  
    editBtn?.addEventListener('click', async () => {
      if (!editMode) {
        setEditMode(true);
      } else {
        await saveCurrentOrder();
        setEditMode(false);
      }
    });
  
    addBtn?.addEventListener('click', () => {
      // 일반 추가 모드일 때는 multiple 속성 유지 (여러 개 선택 가능)
      fileInput.setAttribute('multiple', '');
      fileInput.multiple = true; // 명시적으로 true 설정
      fileInput.click();
    });
    fileInput.removeAttribute('capture');
    fileInput.setAttribute('accept', 'image/*');
  
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      
      // 사진 교체 모드인 경우
      if (targetForReplace && files.length > 0) {
        const file = files[0]; // 첫 번째 파일만 사용
        try {
          const blob = await resizeToBlob(file);
          const id = Number(targetForReplace.dataset.id);
          
          if (!Number.isNaN(id)) {
            // 스크롤 위치 저장
            const savedScrollTop = contentsArea ? contentsArea.scrollTop : 0;
            
            // 기존 셀의 위치(인덱스) 저장
            const currentOrder = getCurrentOrderIds();
            const replaceIndex = currentOrder.indexOf(id);
            
            // 기존 사진 삭제
            await dbDeletePhotoById(id);
            
            // 새 사진 추가 (ID 반환)
            const newId = await dbAddPhoto(blob);
            
            if (!newId) {
              console.error('사진 추가 실패: ID를 받지 못했습니다');
              throw new Error('사진 추가 실패');
            }
            
            // 전체 다시 렌더링
            await renderAll();
            
            // 순서 복원: 기존 위치에 새 사진 배치
            if (newId && replaceIndex >= 0) {
              const restoredOrder = [...currentOrder];
              restoredOrder.splice(replaceIndex, 1, newId); // 기존 ID를 새 ID로 교체
              // 순서 저장
              await dbSetOrder(restoredOrder);
              await renderAll();
            }
            
            await saveCurrentOrder();
            updateGridState();
            applyEmptyMode();
            syncHeaderPaddingToScrollbar();
            
            // 스크롤 위치 복원
            if (contentsArea) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  contentsArea.scrollTop = savedScrollTop;
                });
              });
            }
          }
        } catch (error) {
          console.error('사진 교체 중 오류:', error);
          alert('사진 교체 중 오류가 발생했습니다: ' + error.message);
        } finally {
          targetForReplace = null;
          // 사진 교체 완료 후 multiple 속성 복원
          fileInput.setAttribute('multiple', '');
          fileInput.multiple = true; // 명시적으로 true 설정
        }
      } else {
        // 일반 추가 모드
        for (const f of files) {
          const blob = await resizeToBlob(f);
          await dbAddPhoto(blob);
        }
        await renderAll();
        await saveCurrentOrder();
        applyEmptyMode();
        syncHeaderPaddingToScrollbar();
        scrollAppToTop(); // 새 사진 추가 후 스크롤 최상단 이동
      }
      
      fileInput.value = '';
    });
  
    // ===== Long press (action menu) =====
    const LONG_PRESS_MS = 300;
    const DRAG_THRESHOLD = 16;
  
    // 2가지 옵션 선택 모달 표시 (타이틀 없는 버전)
    function showActionMenuModal(el) {
      const id = 'actionMenuModal';
      const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
      
      // 기존 모달이 있으면 제거
      if (window.modalInstances && window.modalInstances.has(id)) {
        window.hideModal(id);
      }
      
      // 모달 HTML 생성
      const overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      
      const modalCard = document.createElement('div');
      modalCard.className = 'modal-card';
      
      const actions = document.createElement('div');
      actions.className = 'actions';
      actions.style.display = 'flex';
      actions.style.flexDirection = 'column';
      actions.style.gap = '8px';
      
      // 사진 교체 버튼
      const replaceBtn = document.createElement('button');
      replaceBtn.className = 'btn btn--fill--priBlack btn--sz-lg';
      replaceBtn.setAttribute('data-i18n-en', 'Replace with another photo');
      replaceBtn.setAttribute('data-i18n-kr', '다른 사진으로 교체');
      replaceBtn.textContent = currentLang === 'kr' ? '다른 사진으로 교체' : 'Replace with another photo';
      replaceBtn.style.width = '100%';
      
      // 삭제 버튼
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn--fill--priBlack btn--sz-lg';
      deleteBtn.setAttribute('data-i18n-en', 'Delete Photo');
      deleteBtn.setAttribute('data-i18n-kr', '사진 삭제');
      deleteBtn.textContent = currentLang === 'kr' ? '사진 삭제' : 'Delete Photo';
      deleteBtn.style.width = '100%';
      
      // 닫기 버튼
      const closeBtn = document.createElement('button');
      closeBtn.className = 'action cancel btn--sz-lg';
      closeBtn.setAttribute('data-i18n-en', 'Close');
      closeBtn.setAttribute('data-i18n-kr', '닫기');
      closeBtn.textContent = currentLang === 'kr' ? '닫기' : 'Close';
      closeBtn.style.width = '100%';
      
      // 이벤트 리스너
      replaceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideActionMenuModal(id);
        // 사진 교체 모드로 설정하고 fileInput 클릭
        targetForReplace = el;
        // 사진 교체 모드일 때는 multiple 속성 제거 (1개만 선택 가능)
        fileInput.removeAttribute('multiple');
        fileInput.multiple = false; // 명시적으로 false 설정
        fileInput.click();
      });
      
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideActionMenuModal(id);
        // 바로 삭제
        const photoId = Number(el.dataset.id);
        if (!Number.isNaN(photoId)) {
          await dbDeletePhotoById(photoId);
        }
        if (el.parentNode === grid) {
          grid.removeChild(el);
        }
        await saveCurrentOrder();
        updateGridState();
        applyEmptyMode();
        syncHeaderPaddingToScrollbar();
      });
      
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideActionMenuModal(id);
      });
      
      // 배경 클릭 시 닫기
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          hideActionMenuModal(id);
        }
      });
      
      // 구조 조립
      actions.appendChild(replaceBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(closeBtn);
      modalCard.appendChild(actions);
      overlay.appendChild(modalCard);
      
      // DOM에 추가
      document.body.appendChild(overlay);
      
      // 모달 표시
      setTimeout(() => {
        overlay.classList.add('show');
      }, 10);
      
      // 언어 시스템에 새로 추가된 요소 업데이트
      if (window.refreshLanguage) {
        setTimeout(() => {
          window.refreshLanguage();
        }, 0);
      }
    }
    
    function hideActionMenuModal(id) {
      const overlay = document.getElementById(id);
      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 150);
      }
    }
  
    function onPointerDownForLongPress(ev, el) {
      if (editMode) return;
      if (pointerId !== null) return;
      pointerId = ev.pointerId;
      // el.setPointerCapture(ev.pointerId);
      const startX = ev.clientX, startY = ev.clientY;
  
      longPressTimer = setTimeout(() => {
        // 2가지 옵션 선택 모달 표시
        showActionMenuModal(el);
        cleanup();
      }, LONG_PRESS_MS);
  
      const move = (e) => {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
          clearTimeout(longPressTimer); longPressTimer = null; cleanup();
        }
      };
      const up = () => { clearTimeout(longPressTimer); longPressTimer = null; cleanup(); };
      const cancel = () => { clearTimeout(longPressTimer); longPressTimer = null; cleanup(); };
  
      function cleanup() {
        // try { el.releasePointerCapture(pointerId); } catch {}
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        pointerId = null;
      }
  
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
      window.addEventListener('pointercancel', cancel, { once: true });
    }
    
  
    // ===== Handle-based drag (reorder) =====
    function onPointerDownHandle(ev, el) {
      if (!editMode) return;
      if (pointerId !== null) return;
      ev.preventDefault();
      pointerId = ev.pointerId;
      el.setPointerCapture(ev.pointerId);
      dragInfo = { el, started: false, startX: ev.clientX, startY: ev.clientY };
      window.addEventListener('pointermove', onHandleMove);
      window.addEventListener('pointerup', onHandleUp, { once: true });
      window.addEventListener('pointercancel', onHandleUp, { once: true });
    }
  
    function onHandleMove(ev) {
      if (pointerId !== ev.pointerId) return;
      const dx = ev.clientX - dragInfo.startX;
      const dy = ev.clientY - dragInfo.startY;
      if (!dragInfo.started && Math.hypot(dx, dy) > 6) dragStart(ev);
      if (dragInfo.started) dragMove(ev);
    }
  
    async function onHandleUp() {
      if (dragInfo && dragInfo.started) await dragEnd();
      cleanupDrag();
    }
  
    function cleanupDrag() {
      try { dragInfo?.el?.releasePointerCapture?.(pointerId); } catch {}
      window.removeEventListener('pointermove', onHandleMove);
      pointerId = null; dragInfo = null;
    }
  
    function dragStart(ev) {
      dragInfo.started = true;
      dragInfo.el.classList.add('dragging');
      const img = dragInfo.el.querySelector('img');
      dragGhost.innerHTML = '';
      dragGhost.appendChild(img.cloneNode());
      dragGhost.classList.add('show');
      dragGhost.hidden = false;
      dragMove(ev);
    }
  
    function dragMove(ev) {
      dragGhost.style.left = ev.clientX + 'px';
      dragGhost.style.top = ev.clientY + 'px';
      const over = document.elementFromPoint(ev.clientX, ev.clientY);
      const cellEl = over && over.closest ? over.closest('.cell') : null;
      if (!cellEl || cellEl === dragInfo.el) return;
      const fromIdx = indexOfCellEl(dragInfo.el);
      const toIdx = indexOfCellEl(cellEl);
      if (fromIdx === -1 || toIdx === -1) return;
      if (fromIdx < toIdx) grid.insertBefore(dragInfo.el, cellEl.nextSibling);
      else grid.insertBefore(dragInfo.el, cellEl);
    }
  
    async function dragEnd() {
      dragInfo.el.classList.remove('dragging');
      dragGhost.classList.remove('show');
      dragGhost.hidden = true;
      await saveCurrentOrder();
      updateGridState();
      syncHeaderPaddingToScrollbar();
    }
  
    function indexOfCellEl(el) {
      return Array.prototype.indexOf.call(grid.children, el);
    }
  
    // ===== Delete flow =====
    // 모달은 공통 컴포넌트에서 처리됨 (longPressTimer에서 showModal 호출)
  
    // ===== Interstitial (샘플) =====
    setTimeout(() => adOverlay?.classList.add('show'), 3 * 60 * 1000);
    closeAd?.addEventListener('click', () => adOverlay?.classList.remove('show'));
  
    // ===== Pull-to-refresh guard =====
    (function () {
      if (!app) return;
      let startX = 0, startY = 0;
      let startedAtTop = false;
      app.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches.length) return;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        startedAtTop = app.scrollTop <= 0;
      }, { passive: true });
  
      app.addEventListener('touchmove', (e) => {
        if (!e.cancelable) return;
        if (!startedAtTop) return;
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startX);
        const dy = touch.clientY - startY;
        if (dx > 24) return;
        if (dy > 12 && app.scrollTop <= 0) e.preventDefault();
      }, { passive: false });
  
      app.addEventListener('touchend', () => { startedAtTop = false; }, { passive: true });
    })();
  
    // ===== Empty Mode & Header padding helpers =====
    function applyEmptyMode() {
      const isEmpty = grid.children.length === 0;
      document.body.classList.toggle('empty-mode', isEmpty);
      if (emptyGuide) {
        if (isEmpty) {
          emptyGuide.classList.add('show');
          emptyGuide.setAttribute('aria-hidden', 'false');
        } else {
          emptyGuide.classList.remove('show');
          emptyGuide.setAttribute('aria-hidden', 'true');
        }
      }
      if (editBtn) editBtn.disabled = isEmpty;
    }
  
    function syncHeaderPaddingToScrollbar() {
      if (!app) return;
      const sbw = Math.max(0, app.offsetWidth - app.clientWidth);
      // CSS에서 .header-topbar { padding-right: calc(var(--sbw) + 12px) } 로 사용
      document.documentElement.style.setProperty('--sbw', `${sbw}px`);
    }
  
    window.addEventListener('resize', syncHeaderPaddingToScrollbar);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncHeaderPaddingToScrollbar();
    });
  
    // ====== AdSense: 데스크톱/모바일 고정크기 자동 선택 ======
    const PUB_ID = 'ca-pub-3906940826015683';
    const DESKTOP_SLOT = '5125296215';          // 데스크톱 광고 슬롯
    const MOBILE_SLOT  = '5125296215';          // 모바일 광고 슬롯
    const BP = 430; // 화면 너비 임계값
  
    function pickAdConfig() {
      const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      if (w <= BP) {
        // 모바일: 폭 100%로 두고 높이 80px
        return { slot: MOBILE_SLOT, width: '100%', height: 100 };
      } else {
        // 데스크톱: 430x80
        return { slot: DESKTOP_SLOT, width: 430, height: 100 };
      }
    }
  
    function setCSSFooterH(h) {
      document.documentElement.style.setProperty('--footer-h', h + 'px');
    }
  
    function renderAdOnce() {
      const ins = document.querySelector('.footer .adsbygoogle');
      const footer = document.querySelector('.footer');
      if (!ins || !footer) return;
  
      const { slot, width, height } = pickAdConfig();
  
      // 스타일/속성 적용
      ins.style.width  = (typeof width === 'number' ? width + 'px' : width);
      ins.style.height = height + 'px';
      ins.style.maxHeight = height + 'px';
      ins.setAttribute('data-ad-client', PUB_ID);
      ins.setAttribute('data-ad-slot', slot);
      ins.setAttribute('data-full-width-responsive', 'false');
  
      // 푸터 높이 강제 설정
      footer.style.height = height + 'px';
      footer.style.minHeight = height + 'px';
      footer.style.maxHeight = height + 'px';
      setCSSFooterH(height);
  
      // 이미 렌더된 상태면 초기화 후 재렌더
      if (ins.getAttribute('data-adsbygoogle-status') === 'done') {
        ins.removeAttribute('data-adsbygoogle-status');
        ins.innerHTML = '';
      }
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch(e) {
        console.debug('[ads]', e);
      }
      
      // 광고 로드 후에도 높이 유지
      setTimeout(() => {
        ins.style.height = height + 'px';
        ins.style.maxHeight = height + 'px';
        footer.style.height = height + 'px';
        footer.style.minHeight = height + 'px';
        footer.style.maxHeight = height + 'px';
      }, 100);
    }
  
    let lastIsMobile = null;
    function checkAndRerenderAds() {
      const isMobile = (Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth) <= BP);
      if (lastIsMobile === null || lastIsMobile !== isMobile) {
        lastIsMobile = isMobile;
        renderAdOnce();
      }
    }
    window.addEventListener('resize', checkAndRerenderAds);
    window.addEventListener('orientationchange', checkAndRerenderAds);
  
    // header 높이 계산 및 CSS 변수 설정
    function setCSSHeaderH() {
      const header = document.querySelector('.header');
      if (!header) return;
      // rAF를 사용하여 레이아웃이 확정된 후 높이 측정
      requestAnimationFrame(() => {
        const h = header.offsetHeight || 124;
        document.documentElement.style.setProperty('--header-h', `${h}px`);
        // 보이는 상태에선 패딩을 헤더 높이로
        if (!document.body.classList.contains('header-hidden')) {
          document.documentElement.style.setProperty('--header-pad', `${h}px`);
        }
      });
    }

    // 헤더 높이 변화를 실시간으로 추적
    function observeHeaderSize() {
      const header = document.querySelector('.header');
      if (!header || !('ResizeObserver' in window)) return;
      const ro = new ResizeObserver(() => setCSSHeaderH());
      ro.observe(header);
  }

    
    // header 전체 스크롤 숨김/표시 기능 (안정 버전)
    function initHeaderScrollHide() {
      const header = document.querySelector('.header');
      if (!header || !contentsArea) return;
      
      const updateHeaderHeight = () => {
        requestAnimationFrame(() => {
          const h = header.offsetHeight || 124;
          document.documentElement.style.setProperty('--header-h', `${h}px`);
          if (!document.body.classList.contains('header-hidden')) {
            document.documentElement.style.setProperty('--header-pad', `${h}px`);
          }
        });
      };
      
      // 초기 상태: 헤더는 항상 보이는 상태로 시작
      header.classList.remove('is-hidden');
      document.body.classList.remove('header-hidden');
      
      // 초기 패딩 설정 (rAF로 레이아웃 확정 후)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const initialH = header.offsetHeight || 124;
          document.documentElement.style.setProperty('--header-h', `${initialH}px`);
          document.documentElement.style.setProperty('--header-pad', `${initialH}px`);
        });
      });
      
      let lastScrollTop = contentsArea.scrollTop;
      let isHidden = false;
      let hideTimeout = null;
      const SCROLL_THRESHOLD = 50; // 헤더를 숨기기 시작하는 최소 스크롤 위치
      const SCROLL_DELTA = 25;
      
      const hideHeaderSafely = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            header.classList.add('is-hidden');
            isHidden = true;
            document.body.classList.add('header-hidden');          // ⬅️ 패딩 0
            document.documentElement.style.setProperty('--header-pad', '0px');
          });
        });
      };
      
      const showHeaderSafely = () => {
        header.classList.remove('is-hidden');
        isHidden = false;
        document.body.classList.remove('header-hidden');           // ⬅️ 패딩 복구
        const h = header.offsetHeight || 124;
        document.documentElement.style.setProperty('--header-pad', `${h}px`);
        setCSSHeaderH(); // 보이는 순간 재확인 (웹폰트/번역 직후에도 OK)
      };
      
      const handleScroll = () => {
        if (!contentsArea || !header) return;
        const currentScrollTop = contentsArea.scrollTop;
        const scrollDelta = currentScrollTop - lastScrollTop;
        
        // 모달 열림 시 항상 표시
        if (document.querySelector('.overlay.show')) {
          if (isHidden) showHeaderSafely();
          lastScrollTop = currentScrollTop;
          return;
        }
        
        // 스크롤 위치가 0이거나 매우 작을 때는 항상 헤더 표시
        if (currentScrollTop <= 0) {
          if (isHidden) showHeaderSafely();
          lastScrollTop = currentScrollTop;
          return;
        }
        
        // 위로 스크롤하거나 임계값 이하일 때 헤더 표시
        if (scrollDelta < -SCROLL_DELTA || currentScrollTop <= SCROLL_THRESHOLD) {
          if (isHidden) showHeaderSafely();
        } 
        // 아래로 스크롤하고 임계값을 넘었을 때만 헤더 숨김
        else if (scrollDelta > SCROLL_DELTA && currentScrollTop > SCROLL_THRESHOLD) {
          if (!isHidden) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
              if (!contentsArea) return;
              const finalScrollTop = contentsArea.scrollTop;
              // 스크롤 위치가 0보다 크고 임계값을 넘었을 때만 숨김
              if (finalScrollTop > 0 && finalScrollTop > SCROLL_THRESHOLD) {
                hideHeaderSafely();
              }
            }, 300);
          }
        }
        
        lastScrollTop = currentScrollTop;
      };
      
      let ticking = false;
      if (contentsArea) {
        contentsArea.addEventListener('scroll', () => {
          if (ticking) return;
          requestAnimationFrame(() => { handleScroll(); ticking = false; });
          ticking = true;
        }, { passive: true });
      }
    }
  
    // ===== Init =====
    (async function init() {
      setEditMode(false);
      await renderAll();

      applyEmptyMode();
      syncHeaderPaddingToScrollbar();
      setCSSHeaderH();
      observeHeaderSize();
      
      // 리사이즈 시 header 높이 재계산
      window.addEventListener('resize', setCSSHeaderH);

      // 광고 렌더(초기 1회) + 임계 통과 시 재렌더
      renderAdOnce();
      checkAndRerenderAds();
      
      // 사이드 레일 광고 초기화 (데스크톱 전용)
      initSideRailAds();

      if (contentsArea) {
        installPullToRefreshBlocker(contentsArea);
      }
      
      // header 스크롤 숨김 기능 초기화 (안정화된 버전)
      // renderAll() 완료 후 DOM이 렌더링되었으므로 바로 실행
      initHeaderScrollHide();
    })();
    
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
  
  function isIOSSafari() {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isIOS = /iP(hone|ad|od)/.test(navigator.platform) || 
                  (ua.includes('Mac') && 'ontouchend' in document);
    return isSafari && isIOS;
  }
  
  function installPullToRefreshBlocker(el) {
    if (!el || !isIOSSafari()) return;
    let startY = 0, startX = 0;
    let atTop = false, atBottom = false;
    const canScroll = () => el.scrollHeight > el.clientHeight;
  
    el.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      atTop    = el.scrollTop <= 0;
      atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 1;
    }, { passive: true });
  
    el.addEventListener('touchmove', (e) => {
      if (!e.cancelable) return;
      if (!canScroll()) { e.preventDefault(); return; }
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = t.clientY - startY;
      if (dx > 24) return;
      if (dy > 0 && atTop) e.preventDefault();
    }, { passive: false });
  
    el.addEventListener('touchend', () => {
      atTop = atBottom = false;
    }, { passive: true });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // 광고 높이는 renderAdOnce()에서 동적으로 설정됨
    // 이 코드는 제거됨
  });
  