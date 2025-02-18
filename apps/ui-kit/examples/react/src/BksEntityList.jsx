import { useEffect, useRef } from "react";

export default function BksEntityList({ entities, onSelectEntities }) {
  const entitiyListRef = useRef(null);

  function handleItemDblClick(event) {
    const idx = entitiyListRef.current.entities.findIndex((t) => t === event.detail.entity);
    if (idx > -1) {
      onSelectEntities(idx);
    }
  }

  useEffect(() => {
    if (entitiyListRef.current) {
      entitiyListRef.current.addEventListener(
        "bks-entity-dblclick",
        handleItemDblClick
      );
    }
    return () => {
      if (entitiyListRef.current) {
        entitiyListRef.current.removeEventListener(
          "bks-entity-dblclick",
          handleItemDblClick
        );
      }
    };
  }, []);

  useEffect(() => {
    entitiyListRef.current.entities = entities;
  }, [entities]);

  return <bks-entity-list ref={entityListRef} />;
}
