(function () {
  function sendHeight() {
    if (window.parent === window) return;
    var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'linhcoach:height', height: height }, '*');
  }

  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  if (window.ResizeObserver) new ResizeObserver(sendHeight).observe(document.documentElement);
  setTimeout(sendHeight, 300);
  setTimeout(sendHeight, 1200);
})();

