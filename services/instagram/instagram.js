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
        tx.objectStore(OS_PHOTOS).add({ blob, createdAt: Date.now() });
        tx.oncomplete = () => res();
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
    function setEditMode(on) {
      editMode = on;
      document.body.classList.toggle('editing', on);
      if (addBtn) addBtn.disabled = on;
      if (editBtn) {
        // 현재 언어 가져오기
        const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
        
        if (on) {
          // Done 버튼: priBlack 스타일
          editBtn.className = 'btn btn--fill--priBlack btn--sz-me icon--me';
          const checkImg = document.createElement('img');
          checkImg.src = '/icons/check.svg';
          checkImg.alt = '';
          checkImg.className = 'icon';
          checkImg.width = 16;
          checkImg.height = 16;
          editBtn.innerHTML = '';
          editBtn.appendChild(checkImg);
          const doneSpan = document.createElement('span');
          doneSpan.setAttribute('data-i18n-en', 'Done');
          doneSpan.setAttribute('data-i18n-kr', '완료');
          doneSpan.textContent = currentLang === 'kr' ? '완료' : 'Done';
          editBtn.appendChild(doneSpan);
        } else {
          // Edit 버튼: teriGray 스타일
          editBtn.className = 'btn btn--fill--teriGray btn--sz-me icon--me';
          const switchImg = document.createElement('img');
          switchImg.src = '/icons/switch.svg';
          switchImg.alt = '';
          switchImg.className = 'icon';
          switchImg.width = 16;
          switchImg.height = 16;
          editBtn.innerHTML = '';
          editBtn.appendChild(switchImg);
          const editSpan = document.createElement('span');
          editSpan.setAttribute('data-i18n-en', 'Edit');
          editSpan.setAttribute('data-i18n-kr', '편집');
          editSpan.textContent = currentLang === 'kr' ? '편집' : 'Edit';
          editBtn.appendChild(editSpan);
        }
        editBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        
        // 언어 번역 시스템에 새로 추가된 요소 업데이트
        if (window.refreshLanguage) {
          setTimeout(() => {
            window.refreshLanguage();
          }, 0);
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
  
    addBtn?.addEventListener('click', () => fileInput.click());
    fileInput.removeAttribute('capture');
    fileInput.setAttribute('accept', 'image/*');
  
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      
      // 사진 교체 모드인 경우
      if (targetForReplace && files.length > 0) {
        const file = files[0]; // 첫 번째 파일만 사용
        const blob = await resizeToBlob(file);
        const id = Number(targetForReplace.dataset.id);
        
        if (!Number.isNaN(id)) {
          // 기존 셀의 위치(인덱스) 저장
          const currentOrder = getCurrentOrderIds();
          const replaceIndex = currentOrder.indexOf(id);
          
          // 기존 사진 삭제
          await dbDeletePhotoById(id);
          
          // 새 사진 추가
          await dbAddPhoto(blob);
          
          // 전체 다시 렌더링
          await renderAll();
          
          // 새로 추가된 사진의 ID 찾기 (가장 최근에 추가된 것)
          const allPhotos = await dbGetAllPhotos();
          const newPhoto = allPhotos[allPhotos.length - 1]; // 가장 최근 추가된 사진
          
          // 순서 복원: 기존 위치에 새 사진 배치
          if (newPhoto && replaceIndex >= 0) {
            const newOrder = getCurrentOrderIds();
            const newId = newPhoto.id;
            // 새 ID를 기존 위치에 삽입
            const restoredOrder = [...currentOrder];
            restoredOrder.splice(replaceIndex, 1, newId); // 기존 ID를 새 ID로 교체
            // 새로 추가된 ID가 다른 위치에 있으면 제거
            const newIdIndex = restoredOrder.indexOf(newId);
            if (newIdIndex !== replaceIndex && newIdIndex >= 0) {
              restoredOrder.splice(newIdIndex, 1);
            }
            // 순서 저장
            await dbSetOrder(restoredOrder);
            await renderAll();
          }
          
          await saveCurrentOrder();
          updateGridState();
          applyEmptyMode();
          syncHeaderPaddingToScrollbar();
        }
        targetForReplace = null;
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
        fileInput.click();
      });
      
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideActionMenuModal(id);
        // 삭제 확인 모달 표시
        targetForDelete = el;
        window.showModal({
          id: 'deleteModal',
          title: { en: 'Do you want to delete?', kr: '삭제할까요?' },
          cancelText: { en: 'Cancel', kr: '취소' },
          confirmText: { en: 'Delete', kr: '삭제' },
          confirmClass: 'delete',
          onCancel: () => {
            targetForDelete = null;
          },
          onConfirm: async () => {
            if (targetForDelete) {
              const id = Number(targetForDelete.dataset.id);
              if (!Number.isNaN(id)) await dbDeletePhotoById(id);
              if (targetForDelete.parentNode === grid) grid.removeChild(targetForDelete);
              targetForDelete = null;
              await saveCurrentOrder();
              updateGridState();
              applyEmptyMode();
              syncHeaderPaddingToScrollbar();
            }
          }
        });
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
      const headerInner = document.querySelector('.header-inner');
      if (!app || !headerInner) return;
      const sbw = app.offsetWidth - app.clientWidth; // 세로 스크롤바 폭
      headerInner.style.paddingRight = `calc(12px + ${sbw}px)`;
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
        return { slot: MOBILE_SLOT, width: '100%', height: 80 };
      } else {
        // 데스크톱: 430x80
        return { slot: DESKTOP_SLOT, width: 430, height: 80 };
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
      if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-h', headerHeight + 'px');
      }
    }
    
  
    // ===== Init =====
    (async function init() {
      setEditMode(false);
      await renderAll();

      applyEmptyMode();
      syncHeaderPaddingToScrollbar();
      setCSSHeaderH();
      
      // 리사이즈 시 header 높이 재계산
      window.addEventListener('resize', setCSSHeaderH);

      // 광고 렌더(초기 1회) + 임계 통과 시 재렌더
      renderAdOnce();
      checkAndRerenderAds();
      
      // 사이드 레일 광고 초기화 (데스크톱 전용)
      initSideRailAds();

      installPullToRefreshBlocker(document.querySelector('.contentsArea'));
    })();
    
    // 사이드 레일 광고 초기화 함수
    function initSideRailAds() {
      if (window.innerWidth < 1000) return; // 모바일에서는 실행 안 함
      
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
      if (window.innerWidth >= 1000) {
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
  