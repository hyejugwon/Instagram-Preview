// 메뉴 버튼 클릭 시 메뉴 페이지로 이동
(function () {
    function initMenuEvents() {
      // 이벤트 위임: document에 클릭 이벤트 등록
      document.addEventListener('click', function menuClickHandler(e) {
        // 메뉴 버튼 클릭 체크 (img 태그이거나 부모 요소 확인)
        const menuBtn = e.target.id === 'menuBtn' ? e.target : e.target.closest('#menuBtn');
        if (menuBtn) {
          e.preventDefault();
          e.stopPropagation();
          // 메뉴 페이지로 이동
          window.location.href = '/menu.html';
          return;
        }
      });
    }

    // DOM 로드 후 이벤트 초기화
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMenuEvents);
    } else {
      initMenuEvents();
    }
  })();
