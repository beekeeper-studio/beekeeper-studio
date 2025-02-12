import { useEffect, useRef } from "react";

export default function BksTableList({ tables, onSelectTable }) {
  const tableListRef = useRef(null);

  function handleItemDblClick(event) {
    const idx = tableListRef.current.tables.findIndex((t) => t === event.detail.entity);
    if (idx > -1) {
      onSelectTable(idx);
    }
  }

  useEffect(() => {
    if (tableListRef.current) {
      tableListRef.current.addEventListener(
        "bks-entity-dblclick",
        handleItemDblClick
      );
    }
    return () => {
      if (tableListRef.current) {
        tableListRef.current.removeEventListener(
          "bks-entity-dblclick",
          handleItemDblClick
        );
      }
    };
  }, []);

  useEffect(() => {
    tableListRef.current.tables = tables;
  }, [tables]);

  return <bks-table-list ref={tableListRef} />;
}
