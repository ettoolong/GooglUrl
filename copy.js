(() => {
  let t = browser.extension.getBackgroundPage().getShortURL();
  document.addEventListener('copy', e => {
    e.stopImmediatePropagation(); // prevent conflict
    e.preventDefault(); // prevent copy of other data
    e.clipboardData.setData('text/plain', t);
  }, {capture: true, once: true}); // FF50+, Ch55+
  document.execCommand('copy');
  window.close();
})();