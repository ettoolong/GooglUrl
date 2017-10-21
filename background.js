let _short_url = '';

let defaultPreference = {
  currentPage: true,
  hyperlink: true,
  imageSource: true,
  version: 1
};
let preferences = {};
let menuId = null;

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      preferences[item] = changes[item].newValue;
    }
    resetContextMenu();
  }
};

const resetContextMenu = () => {
  browser.contextMenus.removeAll(() => {
    menuId = null;
    createContextMenu();
  });
};

const createContextMenu = () => {
  let contexts = [];
  if(preferences.currentPage) {
    contexts.push('page');
  }
  if(preferences.imageSource) {
    contexts.push('image');
  }
  if(preferences.hyperlink) {
    contexts.push('link');
  }
  if(contexts.length) {
    menuId = browser.contextMenus.create({
      type: 'normal',
      title: 'Goo.gl',
      contexts: contexts,
      onclick: (info, tab) => {
        if (preferences.hyperlink && info.linkUrl) {
          makeShortURL(info.linkUrl);
        }
        else if(preferences.imageSource && info.srcUrl) {
          makeShortURL(info.srcUrl);
        }
        else {
          makeShortURL(tab.url);
        }
      }
    });
  }
};

const loadPreference = () => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
      results = results[0];
    }
    if (!results.version) {
      preferences = defaultPreference;
      browser.storage.local.set(defaultPreference).then(res => {
        browser.storage.onChanged.addListener(storageChangeHandler);
      }, err => {
      });
    } else {
      preferences = results;
      browser.storage.onChanged.addListener(storageChangeHandler);
    }
    resetContextMenu();
  });
};

function showNotification(message) {
  browser.notifications.create('GooglURL', {
    'type': 'basic',
    'iconUrl': 'icon/icon.svg',
    'title': 'Goo.gl URL',
    'message': message
  });
}

function copyToClipboard(text, activeTabID, copyByWindow, callback) {
  if(copyByWindow) {
    browser.windows.create({
      url: 'copy.html',
      type: 'panel',
      top: 0,
      left: 0,
      width: 200,
      height: 70,
    }).then(windowInfo => {
      // windowID = windowInfo.id;
      // tabID = windowInfo.tabs[0].id;
      // let screen = window.screen;
      // let top = screen.top;
      // let left = screen.left + screen.width - 200;
      // browser.windows.update(windowInfo.id,{top: top, left: left});
      callback(true);
    });
  }
  else {
    let code = `
    var node = document.createElement('textarea');
    node.setAttribute('style', 'position: fixed; top: 0; left: -1000px; z-index: -1;');
    node.value = \`${text}\`;
    document.body.appendChild(node);
    node.select();
    var status = document.execCommand('copy');
    document.body.removeChild(node);
    status; // the value returned to chrome.tabs.executeScript() // Array [ true ] // Array [ false ]
    `;
    chrome.tabs.executeScript(activeTabID, {code : code}, function(result){
      callback(result && result[0] ? result[0] : null); });
  }
}

function makeShortURL(long_url) {
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    let copyByWindow = tabs[0].url.startsWith('https://addons.mozilla.org/');
    let keyArray = ['AIzaSyAJo7QuacNSh_zHEKFpFBqvlt9ZgqUbEG0',
                    'AIzaSyCIZD2of6bSj_kQf7nPorEPFiik9xnH-zg'];
    let n = Math.floor(Math.random() * keyArray.length);
    let apiUrl = 'https://www.googleapis.com/urlshortener/v1/url?key=' + keyArray[n];

    let req = new XMLHttpRequest();
    req.onload = function(e) {
      let response = JSON.parse(req.responseText);
      if(response.error) {
        showNotification(browser.i18n.getMessage('returnedErrorMessage', response.error.message));
      }
      else {
        let short_url = _short_url = response.id;
        copyToClipboard(short_url, tabs[0].id, copyByWindow, function(result) {
          if (result) {
            showNotification(browser.i18n.getMessage('copiedToClipboard', [short_url, long_url]));
          }
          else {
            showNotification(browser.i18n.getMessage('creationFailed', browser.i18n.getMessage('errorContacting', 'Access clipboard failed')));
          }
        });
      }
    }
    req.onerror = function(e) {
      showNotification(browser.i18n.getMessage('creationFailed', browser.i18n.getMessage('errorContacting', req.status)));
    }
    req.open('POST', apiUrl);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({longUrl: long_url}));
  });
}

function getShortURL() {
  return _short_url;
}

browser.browserAction.onClicked.addListener(tab => {
  makeShortURL(tab.url);
});

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});
