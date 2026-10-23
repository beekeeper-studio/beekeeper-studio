// Setup the required DOM mocks for CodeMirror
global.document.createRange = () => ({
  setStart: () => {},
  setEnd: () => {},
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0
  }),
  getClientRects: () => [],
  commonAncestorContainer: {
    nodeName: "BODY",
    ownerDocument: document,
  },
});

// Mock getClientRects for elements
Element.prototype.getClientRects = function() {
  return [
    {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0
    }
  ];
};

// Mock getBoundingClientRect for elements
Element.prototype.getBoundingClientRect = function() {
  return {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };
};

// Mock for CodeMirror measurements
global.window.getComputedStyle = function() {
  return {
    getPropertyValue: () => ''
  };
};