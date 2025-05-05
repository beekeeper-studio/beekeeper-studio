import { useEffect, useRef, useState } from "react";
import { Entity, SqlTextEditorElement } from "@beekeeperstudio/ui-kit";

interface BksSqlTextEditorProps {
  entities: Entity[]
}

export default function BksSqlTextEditor({ entities }: BksSqlTextEditorProps) {
  const [initialized, setInitialized] = useState(false);
  const [text, setText] = useState("select * from users u\nwhere u.id = 1;");
  const containerRef = useRef<HTMLDivElement>(null);
  const sqlTextEditorRef = useRef<SqlTextEditorElement>(null as unknown as SqlTextEditorElement);

  function handleInitialized() {
    setInitialized(true);
  }

  function handleUpdateValue(event) {
    if (text === event.detail.value) return;
    setText(event.detail.value);
  }

  useEffect(() => {
    sqlTextEditorRef.current = document.createElement("bks-sql-text-editor") as SqlTextEditorElement;
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
      sqlTextEditorRef.current!.removeEventListener(
        "bks-value-change",
        handleUpdateValue
      );
      sqlTextEditorRef.current.vueComponent.$destroy();
      if (containerRef.current) {
        containerRef.current.removeChild(sqlTextEditorRef.current!);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!sqlTextEditorRef.current) return;
    sqlTextEditorRef.current.entities = entities;
  }, [initialized, entities]);

  return <div ref={containerRef} />;
}
