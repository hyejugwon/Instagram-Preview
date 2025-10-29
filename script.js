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
    if (editBtn) {
      editBtn.disabled = grid.children.length === 0;
    }
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
    const app = document.querySelector('.app');
    const spacer = document.querySelector('.footer-spacer');
  
    const isEmpty = grid.children.length === 0;
  
    if (isEmpty) {
      grid.classList.add('empty');
      document.body.classList.add('empty-mode');   // ✅ 빈 상태 레이아웃 모드 ON
      if (app) app.style.overflow = 'hidden';
      if (spacer) spacer.style.display = 'none';
      if (editBtn) editBtn.disabled = true;        // (이미 적용했으면 유지)
    } else {
      grid.classList.remove('empty');
      document.body.classList.remove('empty-mode'); // ✅ 복귀
      if (app) app.style.overflow = 'auto';
      if (spacer) spacer.style.display = '';
      if (editBtn) editBtn.disabled = false;
    }
  }
  
  

  function scrollAppToTop() {
    if (!app) return;
  
    // 0) 포커스 해제(모바일 키보드/포커스가 스크롤 방해하는 케이스 방지)
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  
    // 1) 현재 그리드 내 이미지가 있으면 디코드/로딩 완료까지 대기
    const imgs = Array.from(grid.querySelectorAll('img'));
    const decodePromises = imgs.map(img => {
      // 이미 로드된 경우도 decode()가 reject될 수 있어 catch로 무시
      if ('decode' in img) return img.decode().catch(() => {});
      // decode가 없으면 load 이벤트로 대체
      if (img.complete) return Promise.resolve();
      return new Promise(res => img.addEventListener('load', res, { once: true }));
    });
  
    Promise.allSettled(decodePromises).then(() => {
      // 2) 레이아웃 확정 후 프레임 두 번 넘긴 다음 스크롤
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // iOS 관성스크롤이 남아있을 수 있으니 여러 타깃에 강제 적용
          try { app.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
          app.scrollTop = 0;
          document.scrollingElement && (document.scrollingElement.scrollTop = 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
  
          // 아주 드물게 튕기는 케이스 보강
          setTimeout(() => {
            app.scrollTop = 0;
            document.scrollingElement && (document.scrollingElement.scrollTop = 0);
          }, 80);
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
      editBtn.innerHTML = on
        ? '<img src="icons/check.svg" alt="" class="icon"> Done'
        : '<img src="icons/switch.svg" alt="" class="icon"> Edit';
      editBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  editBtn?.addEventListener('click', async () => {
    if (!editMode) setEditMode(true);
    else {
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
    scrollAppToTop(); // ✅ 새 사진 추가 후 스크롤 최상단 이동
  });

  // ===== Long press (delete) =====
  const LONG_PRESS_MS = 300;
  const DRAG_THRESHOLD = 16;

  function onPointerDownForLongPress(ev, el) {
    if (editMode) return;
    if (pointerId !== null) return;
    pointerId = ev.pointerId;
    el.setPointerCapture(ev.pointerId);
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
      try { el.releasePointerCapture(pointerId); } catch {}
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
    }
  });

  // ===== Ads =====
  setTimeout(() => adOverlay.classList.add('show'), 3 * 60 * 1000);
  closeAd.addEventListener('click', () => adOverlay.classList.remove('show'));

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

  // ===== Init =====
  (async function init() {
    setEditMode(false);
    await renderAll();

    // 초기화 시 한 번만
    document.querySelectorAll('#editBtn .icon').forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        // 캐시/타이밍 문제 우회
        img.src = img.src.split('?')[0] + '?v=' + Date.now();
      }
    });

  })();
})();
