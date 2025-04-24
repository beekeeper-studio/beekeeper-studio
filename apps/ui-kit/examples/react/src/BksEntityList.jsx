import { useEffect, useRef } from "react";

export default function BksEntityList({ entities, onSelectEntities }) {
  const ref = useRef(null);

  function handleItemDblClick(event) {
    const idx = ref.current.entities.findIndex(
      (entity) => entity === event.detail.entity
    );
    if (idx > -1) {
      onSelectEntities(idx);
    }
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener("bks-entity-dblclick", handleItemDblClick);
    }
    return () => {
      if (ref.current) {
        ref.current.removeEventListener(
          "bks-entity-dblclick",
          handleItemDblClick
        );
        if (ref.current.vueComponent) {
          ref.current.vueComponent.$destroy();
        }
      }
    };
  }, []);

  useEffect(() => {
    ref.current.entities = entities;
  }, [entities]);

  return <bks-entity-list ref={ref} />;
}
