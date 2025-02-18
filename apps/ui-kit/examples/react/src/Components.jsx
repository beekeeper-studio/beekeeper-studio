import { useEffect, useMemo, useState } from "react";
import { getTables } from "./data";
import BksTable from "./BksTable";
import BksSqlTextEditor from "./BksSqlTextEditor";
import BksEntityList from "./BksEntityList";
import BksDataEditor from "./BksDataEditor";

export default function Components() {
  const [entities, setEntities] = useState([]);
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  useEffect(() => {
    setEntities(getTables());
  }, []);

  const columns = useMemo(
    () => entities[selectedTableIdx]?.columns || [],
    [entities, selectedTableIdx]
  );

  const data = useMemo(
    () => entities[selectedTableIdx]?.data || [],
    [entities, selectedTableIdx]
  );

  function handleSelectEntity(idx) {
    setSelectedTableIdx(idx);
  }

  return (
    <>
      <h2>Sql Text Editor</h2>
      <div className="card">
        <BksSqlTextEditor tables={entities} />
      </div>
      <h2>Table</h2>
      <div className="card">
        <BksTable columns={columns} data={data} />
      </div>
      <h2>Table List</h2>
      <div className="card">
        <BksEntityList entities={entities} onSelectEntity={handleSelectEntity} />
      </div>
      <h2>Data Editor</h2>
      <div className="card">
        <BksDataEditor tables={entities} />
      </div>
    </>
  );
}
