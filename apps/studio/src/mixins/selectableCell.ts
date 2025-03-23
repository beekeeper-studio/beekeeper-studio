export const SelectableCellMixin = {
    methods: {
      handleCellDoubleClick(cell) {
        const element = cell.getElement();
  
        // If already editable, remove contenteditable and stop execution
        if (element.hasAttribute("contenteditable")) {
          element.removeAttribute("contenteditable");
          window.getSelection().removeAllRanges();
          return;
        }
  
        // Enable text selection
        element.setAttribute("contenteditable", "true");
        element.focus();
        document.execCommand("selectAll");
  
        const removeEditable = () => {
          element.removeAttribute("contenteditable");
          window.getSelection().removeAllRanges();
          document.removeEventListener("click", removeEditable);
        };
  
        setTimeout(() => {
          document.addEventListener("click", removeEditable);
        }, 0);
      }
    }
}
