import { useEffect, useRef } from "react";

export default function BksDataEditor({ tables }) {
  const dataEditorRef = useRef(null);

  function handleQuerySubmit(event) {
    alert(`Query: ${event.detail[0]}`);
  }

  useEffect(() => {
    if (dataEditorRef.current) {
      dataEditorRef.current.addEventListener(
        "bks-query-submit",
        handleQuerySubmit
      );
    }
    return () => {
      if (dataEditorRef.current) {
        dataEditorRef.current.removeEventListener(
          "bks-query-submit",
          handleQuerySubmit
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!dataEditorRef.current) return;
    dataEditorRef.current.tables = tables;
  }, [tables]);

  return <bks-data-editor ref={dataEditorRef} />;
}
