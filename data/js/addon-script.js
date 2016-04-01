let self = require("sdk/self");
let data = self.data;
let contextMenu = require("sdk/context-menu");
let xhr = require("sdk/net/xhr");
let notifications = require("sdk/notifications");
let clipboard = require("sdk/clipboard");
let tabs = require("sdk/tabs");
let _ = require("sdk/l10n").get;
let tempUrl = '';

function dummy(text, callback) {
  callback(text);
}

exports.dummy = dummy;
function showNotification(message) {
  notifications.notify({
    iconURL: data.url("images/icon.svg"),
    title: "Goo.gl URL",
    text: message
  });
}

function makeShortURL(long_url) {
  let keyArray = ["AIzaSyAJo7QuacNSh_zHEKFpFBqvlt9ZgqUbEG0",
                  "AIzaSyCIZD2of6bSj_kQf7nPorEPFiik9xnH-zg"];
  let n = Math.floor(Math.random() * keyArray.length);
  let apiUrl = "https://www.googleapis.com/urlshortener/v1/url?key=" + keyArray[n];
  let req = new xhr.XMLHttpRequest();
  req.onload = function(e) {
    let response = JSON.parse(req.responseText);
    if(response.error) {
      showNotification(_("returnedErrorMessage", response.error.message));
    }
    else {
      let short_url = response.id;
      clipboard.set(short_url);
      showNotification(_("copiedToClipboard", short_url, long_url));
    }
  }
  req.onerror = function(e) {
    showNotification(_("creationFailed", _("errorContacting", req.status)));
  }
  req.open("POST", apiUrl);
  req.setRequestHeader("Content-Type", "application/json");
  //req.setRequestHeader("Referer", "resource://googlurl/data/js/addon-script.js");
  req.send(JSON.stringify({longUrl: long_url}));
}

let menuItem = contextMenu.Item({
  label: "Goo.gl",
  image: data.url("images/icon.svg"),
  context: [
    contextMenu.PredicateContext(function(context){ tempUrl = context.linkURL || context.srcURL; return !!tempUrl;}),
    contextMenu.SelectorContext("a[href], img[src]")
  ],
  contentScriptFile: data.url("js/context-menu.js"),
  onMessage: function (url) {
    url = url || tempUrl;
    if(url)
      makeShortURL(url);
  }
});

require("sdk/ui/button/action").ActionButton({
  id: "googl-toolbutton",
  label: "Goo.gl",
  icon: {
    "16": data.url("images/icon.svg"),
    "32": data.url("images/icon.svg"),
    "64": data.url("images/icon.svg")
  },
  onClick:function handleClick(state) {
    //make from current page
    makeShortURL(tabs.activeTab.url);
  }
});
