self.on("click", function(node, data) {
  if(node.nodeName == "IMG") {
    //make from image url
    self.postMessage(node.src);
  } else if(node.nodeName == "A") {
    //make from link
    self.postMessage(node.href);
  }
});
