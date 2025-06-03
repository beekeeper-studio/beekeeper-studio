import { useEffect, useRef, useState } from "react";
import { Column, BaseData, TableElement } from "@beekeeperstudio/ui-kit";

interface BksTableProps {
  columns: Column[];
  data: BaseData;
}

export default function BksTable({ columns, data }: BksTableProps) {
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TableElement>(null as unknown as TableElement);

  useEffect(() => {
    tableRef.current = document.createElement("bks-table") as TableElement;
    const handleInitialized = () => {
      setInitialized(true);
    }
    tableRef.current.addEventListener("bks-initialized", handleInitialized);
    if (containerRef.current) {
      containerRef.current.appendChild(tableRef.current);
    }
    return () => {
      tableRef.current.removeEventListener("bks-initialized", handleInitialized);
      tableRef.current.vueComponent.$destroy();
      if (containerRef.current) {
        containerRef.current.removeChild(tableRef.current);
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
