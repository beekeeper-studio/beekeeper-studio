import { useEffect, useRef, useState } from "react";

export default function BksTextEditor() {
  const [initialized, setInitialized] = useState(false);
  const [text, setText] = useState(`function sum(a, b) {
    return a + b;
  }`);
  const containerRef = useRef(null);
  const textEditorRef = useRef(null);

  function handleInitialized() {
    setInitialized(true);
  }

  function handleUpdateValue(event) {
    if (text === event.detail.value) return;
    setText(event.detail.value);
  }

  useEffect(() => {
    textEditorRef.current = document.createElement("bks-text-editor");
    textEditorRef.current.value = text;
    
    textEditorRef.current.addEventListener(
      "bks-initialized",
      handleInitialized
    );
    textEditorRef.current.addEventListener(
      "bks-value-change",
      handleUpdateValue
    );

    if (containerRef.current) {
      containerRef.current.appendChild(textEditorRef.current);
    }

    return () => {
      textEditorRef.current.removeEventListener(
        "bks-value-change",
        handleUpdateValue
      );
      textEditorRef.current.vueComponent.$destroy()
      if (containerRef.current) {
        containerRef.current.removeChild(textEditorRef.current);
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
