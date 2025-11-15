// 메뉴 모달 HTML 주입 및 초기화
(function () {
    let menuInitialized = false;
    
    function injectMenuModal() {
      // 이미 주입되어 있으면 다시 주입하지 않음
      if (document.getElementById('menuOverlay')) {
        return Promise.resolve();
      }
      
      // index.css가 이미 로드되어 있는지 확인
      const existingLink = document.querySelector('link[href="/css/index.css"]');
      if (!existingLink) {
        // index.css를 head에 동적으로 추가
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/index.css';
        document.head.appendChild(link);
      }
      
      return fetch("/partials/menu-modal.html", { cache: "no-cache" })
        .then((res) => res.text())
        .then((html) => {
          const tpl = document.createElement("template");
          tpl.innerHTML = html.trim();
          // fragment의 자식들을 <body>로 이동
          document.body.appendChild(tpl.content);
        })
        .catch((err) => console.error("menu-modal.html load failed:", err));
    }


    function initMenuEvents() {
      if (menuInitialized) return;
      
      const menuOverlay = document.getElementById('menuOverlay');
      const closeMenuBtn = document.getElementById('closeMenuBtn');

      if (!menuOverlay) {
        // menuOverlay가 없으면 아직 주입되지 않은 상태
        return;
      }

      // 사이드 광고 표시/숨김 함수 (메뉴 모달이 열릴 때 숨김)
      function updateSideRailAdsVisibility(show) {
        const sideRailAds = document.querySelectorAll('.side-rail-ad');
        sideRailAds.forEach(ad => {
          if (show) {
            // 메뉴 모달이 열릴 때 사이드 광고 숨김 (AdSense 정책 준수)
            ad.style.display = 'none';
          } else {
            // 메뉴 모달이 닫힐 때 사이드 광고 복원 (데스크톱에서만)
            if (window.innerWidth >= 1000) {
              ad.style.display = 'block';
            }
          }
        });
      }

      // 이벤트 위임: document에 클릭 이벤트 등록
      document.addEventListener('click', function menuClickHandler(e) {
        // 메뉴 버튼 클릭 체크 (img 태그이거나 부모 요소 확인)
        const menuBtn = e.target.id === 'menuBtn' ? e.target : e.target.closest('#menuBtn');
        if (menuBtn) {
          e.preventDefault();
          e.stopPropagation();
          const overlay = document.getElementById('menuOverlay');
          if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            updateSideRailAdsVisibility(true); // 사이드 광고 숨김
          }
          // nutrition-info 닫기 (subway 페이지인 경우)
          const nutritionInfo = document.getElementById('nutritionInfo');
          if (nutritionInfo) {
            nutritionInfo.style.display = 'none';
            const detailBtn = document.getElementById('detailBtn');
            if (detailBtn) {
              detailBtn.textContent = '상세보기';
            }
          }
          return;
        }
        
        // 닫기 버튼 클릭 체크 (img 태그이거나 부모 요소 확인)
        const closeBtn = e.target.id === 'closeMenuBtn' ? e.target : e.target.closest('#closeMenuBtn');
        if (closeBtn) {
          const overlay = document.getElementById('menuOverlay');
          if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            updateSideRailAdsVisibility(false); // 사이드 광고 복원
          }
          return;
        }
        
        // 모달 배경 클릭 체크
        if (e.target && e.target.id === 'menuOverlay') {
          const overlay = document.getElementById('menuOverlay');
          if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            updateSideRailAdsVisibility(false); // 사이드 광고 복원
          }
        }
      });

      menuInitialized = true;
      console.log('Menu events initialized with event delegation');
    }

    function setupMenu() {
      console.log('setupMenu called');
      
      // body가 준비될 때까지 기다림
      function waitForBody() {
        if (document.body) {
          injectMenuModal().then(() => {
            console.log('Menu modal injected');
            // 메뉴 모달 주입 후 이벤트 초기화 시도
            initMenuEvents();
            
            // menu-modal이 주입된 후 언어 시스템 새로고침
            if (window.refreshLanguage) {
              setTimeout(() => {
                window.refreshLanguage();
              }, 100);
            }
            
            // menuBtn이 아직 없을 수 있으므로 잠시 후 다시 시도
            setTimeout(() => {
              if (!document.getElementById('menuBtn')) {
                console.log('menuBtn not found after 200ms, retrying...');
                initMenuEvents();
              } else {
                console.log('menuBtn found');
              }
            }, 200);
          });
        } else {
          console.log('Waiting for body...');
          setTimeout(waitForBody, 50);
        }
      }
      
      waitForBody();
    }

    // DOM 로드 후 주입 및 초기화
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupMenu);
    } else {
      setupMenu();
    }

    // 추가 안전장치: window.load 후에도 다시 시도
    window.addEventListener('load', () => {
      console.log('Window loaded, initializing menu events');
      initMenuEvents();
    });
  })();
