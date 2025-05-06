import { useEffect, useRef } from "react";

export default function BksDataEditor({ entities }) {
  const ref = useRef(null);

  function handleQuerySubmit(event) {
    ref.current.setTable({
      name: "result",
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
        ref.current.vueComponent.$destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.entities = entities;
  }, [entities]);

  return <bks-data-editor ref={ref} />;
}
