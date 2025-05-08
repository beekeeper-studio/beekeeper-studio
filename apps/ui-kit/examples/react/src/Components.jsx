import { useEffect, useMemo, useState } from "react";
import { getEntities } from "./data";
import BksTable from "./BksTable";
import BksTextEditor from "./BksTextEditor";
import BksSqlTextEditor from "./BksSqlTextEditor";
import BksEntityList from "./BksEntityList";
import BksDataEditor from "./BksDataEditor";

export default function Components() {
  const [entities, setEntities] = useState([]);
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  useEffect(() => {
    const entities = getEntities()
    setEntities(entities);
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
      <h2>Text Editor</h2>
      <div className="card">
        <BksTextEditor />
      </div>
      <h2>Sql Text Editor</h2>
      <div className="card">
        <BksSqlTextEditor entities={entities} />
      </div>
      <h2>Table</h2>
      <div className="card">
        <BksTable columns={columns} data={data} />
      </div>
      <h2>Entity List</h2>
      <div className="card">
        <BksEntityList entities={entities} onSelectEntity={handleSelectEntity} />
      </div>
      <h2>Data Editor</h2>
      <div className="card">
        <BksDataEditor entities={entities} />
      </div>
      <h2>CSS Customization</h2>
      <div className="card custom-theme">
        <BksDataEditor entities={entities} />
      </div>
    </>
  );
}
