const amo = /^https?:\/\/(discovery\.)?(addons\.mozilla\.org|testpilot\.firefox\.com)|^about:/i;
let _temp_text = '';

let defaultPreference = {
  currentPage: true,
  hyperlink: true,
  imageSource: true,
  copyUrl: 0, //0: automatic, 1: manual
  showNotifications: true,
  autoClosePopup: true,
  version: 2
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
    resetPopup();
  }
};

const resetContextMenu = () => {
  browser.contextMenus.removeAll(() => {
    menuId = null;
    createContextMenu();
  });
};

const resetPopup = () => {
  let popup = preferences.copyUrl === 1 ? 'popup.html' : '';
  browser.browserAction.setPopup(
    {popup: popup}
  )
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

    if (preferences.version !== defaultPreference.version) {
      let update = {};
      let needUpdate = false;
      for(let p in defaultPreference) {
        if(preferences[p] === undefined) {
          update[p] = defaultPreference[p];
          needUpdate = true;
        }
      }
      if(needUpdate) {
        browser.storage.local.set(update).then(null, err => {});
      }
    }

    resetContextMenu();
    resetPopup();
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
  _temp_text = text;
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
    let code = `(() => {
      document.addEventListener('copy', e => {
        e.stopImmediatePropagation(); // prevent conflict
        e.preventDefault(); // prevent copy of other data
        e.clipboardData.setData('text/plain', ${JSON.stringify(text)});
      }, {capture: true, once: true}); // FF50+, Ch55+
      return document.execCommand('copy');
    })();`;

    chrome.tabs.executeScript(activeTabID, {code : code}, function(result){
      callback(result && result[0] ? result[0] : null);
    });
  }
}

function makeShortURL(long_url, callback) {
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    if(long_url === '')
      long_url = tabs[0].url;
    let copyByWindow = amo.test(tabs[0].url);
    // let copyByWindow = tabs[0].url.startsWith('https://addons.mozilla.org/');
    let keyArray = ['AIzaSyAJo7QuacNSh_zHEKFpFBqvlt9ZgqUbEG0',
                    'AIzaSyCIZD2of6bSj_kQf7nPorEPFiik9xnH-zg'];
    let n = Math.floor(Math.random() * keyArray.length);
    let apiUrl = 'https://www.googleapis.com/urlshortener/v1/url?key=' + keyArray[n];

    let req = new XMLHttpRequest();
    req.onload = function(e) {
      let response = JSON.parse(req.responseText);
      if(response.error) {
        let message = browser.i18n.getMessage('returnedErrorMessage', response.error.message);
        if(callback) {
          callback(message);
        }
        else {
          if(preferences.showNotifications) {
            showNotification(message);
          }
          else {
            copyToClipboard(message, tabs[0].id, copyByWindow, result => {});
          }
        }
      }
      else {
        let short_url = response.id;
        if(callback) {
          callback(null, short_url);
        }
        else {
          copyToClipboard(short_url, tabs[0].id, copyByWindow, result => {
            if (result) {
              showNotification(browser.i18n.getMessage('copiedToClipboard', [short_url, long_url]));
            }
            else {
              showNotification(browser.i18n.getMessage('creationFailed', browser.i18n.getMessage('errorContacting', 'Access clipboard failed')));
            }
          });
        }
      }
    }
    req.onerror = function(e) {
      let message = browser.i18n.getMessage('creationFailed', browser.i18n.getMessage('errorContacting', req.status));
      if(callback) {
        callback(message);
      }
      else {
        if(preferences.showNotifications) {
          showNotification(message);
        }
        else {
          copyToClipboard(message, tabs[0].id, copyByWindow, result => {});
        }
      }
    }
    req.open('POST', apiUrl);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({longUrl: long_url}));
  });
}

function getTempText() {
  return _temp_text;
}

function getPreference(name) {
  return preferences[name];
}

browser.browserAction.onClicked.addListener(tab => {
  makeShortURL(tab.url);
});

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});

const messageHandler = (message, sender, sendResponse) => {
  if(message.action === 'shortenUrl') {
    makeShortURL(message.url);
  }
  else if(message.action === 'shortenUrlWithResponse') {
    makeShortURL(message.url, (err, url) => {
      sendResponse({err: err, url: url});
    });
    return true;
  }
};

browser.runtime.onMessage.addListener(messageHandler);
browser.runtime.onMessageExternal.addListener(messageHandler);

/*
  APIs for other addon, for example:

  ```
  browser.runtime.sendMessage('@googlurl',
  {
    action: 'shortenUrlWithResponse',
    url: data.element.linkHref
  }).then( message => {
    if(message.err) {
      // handle error message
    }
    console.log(message.url); //shortened URL
  });
  ```
  or

  ```
  browser.runtime.sendMessage('@googlurl',
  {
    action: 'shortenUrl',
    url: data.element.linkHref
  }).then();
  ```
*/
