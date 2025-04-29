import { useEffect, useRef, useState } from "react";
import { Column, BaseData, TableElement } from "@beekeeperstudio/ui-kit";

interface BksTableProps {
  columns: Column[];
  data: BaseData;
}

export default function BksTable({ columns, data }: BksTableProps) {
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<TableElement | null>(null);

  useEffect(() => {
    const table = document.createElement("bks-table") as TableElement;
    const listener = () => setInitialized(true);
    table.addEventListener("bks-initialized", listener);
    tableRef.current = table;
    if (containerRef.current) {
      containerRef.current.appendChild(table);
    }
    return () => {
      table.removeEventListener("bks-initialized", listener);
      tableRef.current.vueComponent.$destroy();
      if (containerRef.current) {
        containerRef.current.removeChild(table);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!tableRef.current) return;
    tableRef.current.columns = columns;
    tableRef.current.data = data;
  }, [initialized, columns, data]);

  return <div ref={containerRef} />;
}
