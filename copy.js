let text = browser.extension.getBackgroundPage().getShortURL();
let node = document.createElement('textarea');
node.setAttribute('style', 'position: fixed; top: 0; left: -1000px; z-index: -1;');
node.value = `${text}`;
document.body.appendChild(node);
node.select();
let status = document.execCommand('copy');
document.body.removeChild(node);
window.close();
