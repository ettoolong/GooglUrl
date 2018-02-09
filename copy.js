(() => {
  let t = browser.extension.getBackgroundPage().getTempText();
  document.addEventListener('copy', e => {
    e.stopImmediatePropagation(); // prevent conflict
    e.preventDefault(); // prevent copy of other data
    e.clipboardData.setData('text/plain', t);
  }, {capture: true, once: true}); // FF50+, Ch55+
  document.execCommand('copy');
  browser.windows.getCurrent((win) => {
    browser.runtime.sendMessage({action: 'closeCopyWindow', winId: win.id}).then();
  });
})();
