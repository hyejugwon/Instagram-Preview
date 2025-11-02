// head.html 동적 주입 스크립트
(function () {
    var basePath = location.hostname.endsWith('github.io') ? '/Instagram-Preview' : '';
    var headUrl = basePath + '/partials/head.html';
    
    fetch(headUrl, { cache: "no-cache" })
      .then((res) => res.text())
      .then((html) => {
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        
        // script 태그를 찾아서 따로 처리
        const scripts = tpl.content.querySelectorAll('script');
        scripts.forEach(script => {
          // script 태그를 head에서 제거
          script.remove();
          // script를 body 끝에 추가하여 실행되도록 함
          if (document.body) {
            document.body.appendChild(script);
          } else {
            // body가 아직 없으면 DOMContentLoaded 후 실행
            document.addEventListener('DOMContentLoaded', () => {
              document.body.appendChild(script);
            });
          }
        });
        
        // 경로 수정: basePath가 있으면 모든 절대 경로에 추가
        if (basePath) {
          const links = tpl.content.querySelectorAll('link[href^="/"]');
          links.forEach(link => {
            link.href = basePath + link.getAttribute('href');
          });
        }
        
        // 나머지 요소들을 <head>로 이동
        document.head.appendChild(tpl.content);
      })
      .catch((err) => console.error("head.html load failed:", err));
  })();

