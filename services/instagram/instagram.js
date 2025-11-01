(function () {
    // ===== DOM =====
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const fileInput = document.getElementById('fileInput');
    const grid = document.getElementById('grid');
    const deleteOverlay = document.getElementById('deleteOverlay');
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');
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
      const spacer = document.querySelector('.footer-spacer');
      const isEmpty = grid.children.length === 0;
  
      if (isEmpty) {
        grid.classList.add('empty');
        document.body.classList.add('empty-mode');
        if (app) app.style.overflow = 'auto';
        if (spacer) spacer.style.display = 'none';
        if (editBtn) editBtn.disabled = true;
      } else {
        grid.classList.remove('empty');
        document.body.classList.remove('empty-mode');
        if (app) app.style.overflow = 'auto';
        if (spacer) spacer.style.display = '';
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
        if (on) {
          // Done 버튼: priBlack 스타일
          editBtn.className = 'btn btn--fill--priBlack btn--sz-me icon--me';
          editBtn.innerHTML = '<img src="/icons/check.svg" alt="" class="icon" width="16" height="16"> <span>Done</span>';
        } else {
          // Edit 버튼: teriGray 스타일
          editBtn.className = 'btn btn--fill--teriGray btn--sz-me icon--me';
          editBtn.innerHTML = '<img src="/icons/switch.svg" alt="" class="icon" width="16" height="16"> <span>Edit</span>';
        }
        editBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
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
      for (const f of files) {
        const blob = await resizeToBlob(f);
        await dbAddPhoto(blob);
      }
      fileInput.value = '';
      await renderAll();
      await saveCurrentOrder();
      applyEmptyMode();
      syncHeaderPaddingToScrollbar();
      scrollAppToTop(); // 새 사진 추가 후 스크롤 최상단 이동
    });
  
    // ===== Long press (delete) =====
    const LONG_PRESS_MS = 300;
    const DRAG_THRESHOLD = 16;
  
    function onPointerDownForLongPress(ev, el) {
      if (editMode) return;
      if (pointerId !== null) return;
      pointerId = ev.pointerId;
      // el.setPointerCapture(ev.pointerId);
      const startX = ev.clientX, startY = ev.clientY;
  
      longPressTimer = setTimeout(() => {
        targetForDelete = el;
        deleteOverlay.classList.add('show');
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
    cancelDelete.addEventListener('click', () => {
      targetForDelete = null;
      deleteOverlay.classList.remove('show');
    });
  
    confirmDelete.addEventListener('click', async () => {
      if (targetForDelete) {
        const id = Number(targetForDelete.dataset.id);
        if (!Number.isNaN(id)) await dbDeletePhotoById(id);
        if (targetForDelete.parentNode === grid) grid.removeChild(targetForDelete);
        targetForDelete = null;
        deleteOverlay.classList.remove('show');
        await saveCurrentOrder();
        updateGridState();
        applyEmptyMode();
        syncHeaderPaddingToScrollbar();
      }
    });
  
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
    const DESKTOP_SLOT = '2467327374';          // 430x90 (이미 생성된 슬롯)
    const MOBILE_SLOT  = 'YOUR_MOBILE_SLOT_ID'; // 320x100 또는 320x50로 새로 만든 슬롯 ID로 교체
    const BP = 430; // 화면 너비 임계값
  
    function pickAdConfig() {
      const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      if (w <= BP) {
        // 모바일: 폭 100%로 두고 높이 100(또는 50) 픽셀
        return { slot: MOBILE_SLOT, width: '100%', height: 100 };
      } else {
        // 데스크톱: 430x90
        return { slot: DESKTOP_SLOT, width: 430, height: 90 };
      }
    }
  
    function setCSSFooterH(h) {
      document.documentElement.style.setProperty('--footer-h', h + 'px');
    }
  
    function renderAdOnce() {
      const ins = document.querySelector('.footer .adsbygoogle');
      if (!ins) return;
  
      const { slot, width, height } = pickAdConfig();
  
      // 스타일/속성 적용
      ins.style.width  = (typeof width === 'number' ? width + 'px' : width);
      ins.style.height = height + 'px';
      ins.setAttribute('data-ad-client', PUB_ID);
      ins.setAttribute('data-ad-slot', slot);
      ins.setAttribute('data-full-width-responsive', 'false');
  
      // 푸터 높이 동기화
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
  
    // ===== Init =====
    (async function init() {
      setEditMode(false);
      await renderAll();
  
      // 헤더 아이콘 첫 로드 보정
      document.querySelectorAll('#editBtn .icon').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          img.src = img.src.split('?')[0] + '?v=' + Date.now();
        }
      });
  
      applyEmptyMode();
      syncHeaderPaddingToScrollbar();

      // 광고 렌더(초기 1회) + 임계 통과 시 재렌더
      renderAdOnce();
      checkAndRerenderAds();
  
      installPullToRefreshBlocker(document.querySelector('.app'));
    })();
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
    const ins = document.querySelector('.footer .adsbygoogle');
    if (ins){
      ins.style.width = '430px';
      ins.style.height = '90px';
    }
  });
  