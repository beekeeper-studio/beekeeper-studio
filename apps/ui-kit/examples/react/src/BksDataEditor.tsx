import { useEffect, useRef } from "react";
import { DataEditorElement, Table } from "@beekeeperstudio/ui-kit";

interface BksDataEditorProps {
  tables: Table[];
}

export default function BksDataEditor({ tables }: BksDataEditorProps) {
  const ref = useRef<DataEditorElement | null>(null);

  function handleQuerySubmit(event) {
    ref.current!.setTable({
      name: "result",
      entityType: "table",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
      data: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
    });
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener(
        "bks-query-submit",
        handleQuerySubmit
      );
    }
    return () => {
      if (ref.current) {
        ref.current.removeEventListener(
          "bks-query-submit",
          handleQuerySubmit
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.entities = tables;
  }, [tables]);

  return <bks-data-editor ref={ref} />;
}
