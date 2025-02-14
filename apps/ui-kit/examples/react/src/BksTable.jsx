import { useEffect, useRef, useState } from "react";

export default function BksTable({ columns, data }) {
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    const table = document.createElement("bks-table");
    const listener = () => setInitialized(true);
    table.addEventListener("bks-initialized", listener);
    tableRef.current = table;
    if (containerRef.current) {
      containerRef.current.appendChild(table);
    }
    return () => {
      table.removeEventListener("bks-initialized", listener);
      tableRef.current = null;
      if (containerRef.current) {
        containerRef.current.removeChild(table);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized && !tableRef.current) return;
    tableRef.current.columns = columns;
    tableRef.current.data = data;
  }, [initialized, columns, data]);

  return <div ref={containerRef} />;
}
