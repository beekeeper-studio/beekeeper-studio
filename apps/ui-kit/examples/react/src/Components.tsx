import { useEffect, useState } from "react";
import { getEntities, Entity } from "./data";
import BksTextEditor from "./BksTextEditor";
import BksSqlTextEditor from "./BksSqlTextEditor";

export default function Components() {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    const entities = getEntities()
    setEntities(entities);
  }, []);

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
    </>
  );
}
