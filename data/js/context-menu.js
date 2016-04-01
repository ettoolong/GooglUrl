self.on("click", function(node, data) {
  if(node.nodeName == "IMG") {
    //make from image url
    self.postMessage(node.src);
  }
  else {
    //make from link
    self.postMessage();
  }
});
