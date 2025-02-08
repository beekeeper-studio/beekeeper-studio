import { useEffect, useMemo, useState } from "react";
import { getTables } from "./data";
import BksTable from "./BksTable";
import BksSqlTextEditor from "./BksSqlTextEditor";
import BksTableList from "./BksTableList";
import BksDataEditor from "./BksDataEditor";

export default function Components() {
  const [tables, setTables] = useState([]);
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  useEffect(() => {
    setTables(getTables());
  }, []);

  const columns = useMemo(
    () => tables[selectedTableIdx]?.columns || [],
    [tables, selectedTableIdx]
  );

  const data = useMemo(
    () => tables[selectedTableIdx]?.data || [],
    [tables, selectedTableIdx]
  );

  function handleSelectTable(idx) {
    setSelectedTableIdx(idx);
  }

  return (
    <>
      <h2>Sql Text Editor</h2>
      <div className="card">
        <BksSqlTextEditor tables={tables} />
      </div>
      <h2>Table</h2>
      <div className="card">
        <BksTable columns={columns} data={data} />
      </div>
      <h2>Table List</h2>
      <div className="card">
        <BksTableList tables={tables} onSelectTable={handleSelectTable} />
      </div>
      <h2>Data Editor</h2>
      <div className="card">
        <BksDataEditor tables={tables} />
      </div>
    </>
  );
}
