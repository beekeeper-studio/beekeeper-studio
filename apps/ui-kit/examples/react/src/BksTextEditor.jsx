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

    /* --------- For activating the language server client ------------ */
    // textEditorRef.current.lsConfig = {
    //   languageId: "typescript",
    //   transport: {
    //     wsUri: "ws://localhost:3000/server",
    //   },
    //   rootUri: "/home/user/dev/beekeeper-studio/apps/ui-kit/tests/fixtures/",
    //   documentUri: "/home/user/dev/beekeeper-studio/apps/ui-kit/tests/fixtures/index.ts",
    // }

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
      textEditorRef.current.removeEventListener(
        "bks-initialized",
        handleInitialized
      );
      if (textEditorRef.current.vueComponent) {
        textEditorRef.current.vueComponent.$destroy();
      }
      if (containerRef.current) {
        containerRef.current.removeChild(textEditorRef.current);
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
