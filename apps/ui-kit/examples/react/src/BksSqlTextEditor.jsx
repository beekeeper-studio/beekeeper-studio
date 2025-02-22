import { useEffect, useRef, useState } from "react";

export default function BksSqlTextEditor({ tables }) {
  const [initialized, setInitialized] = useState(false);
  const [text, setText] = useState("select * from users u\nwhere u.id = 1;");
  const containerRef = useRef(null);
  const sqlTextEditorRef = useRef(null);

  function handleInitialized() {
    setInitialized(true);
  }

  function handleUpdateValue(event) {
    const [updatedText] = event.detail;
    if (text === updatedText) return;
    setText(updatedText);
  }

  useEffect(() => {
    sqlTextEditorRef.current = document.createElement("bks-sql-text-editor");
    sqlTextEditorRef.current.value = text;
    sqlTextEditorRef.current.addEventListener(
      "bks-initialized",
      handleInitialized
    );
    sqlTextEditorRef.current.addEventListener(
      "bks-value-change",
      handleUpdateValue
    );

    if (containerRef.current) {
      containerRef.current.appendChild(sqlTextEditorRef.current);
    }

    return () => {
      sqlTextEditorRef.current.removeEventListener(
        "bks-value-change",
        handleUpdateValue
      );
      if (containerRef.current) {
        containerRef.current.removeChild(sqlTextEditorRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    sqlTextEditorRef.current.tables = tables;
  }, [initialized, tables]);

  return <div ref={containerRef} />;
}
