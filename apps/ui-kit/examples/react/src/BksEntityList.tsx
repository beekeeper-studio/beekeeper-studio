import { useEffect, useRef } from "react";
import { Entity, EntityListElement } from "@beekeeperstudio/ui-kit";

interface BksEntityListProps {
  entities: Entity[];
  onSelectEntity: (idx: number) => void;
}

export default function BksEntityList({ entities, onSelectEntity }: BksEntityListProps) {
  const ref = useRef<EntityListElement | null>(null);

  function handleItemDblClick(event) {
    const idx = ref.current!.entities.findIndex(
      (entity) => entity === event.detail.entity
    );
    if (idx > -1) {
      onSelectEntity(idx);
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
    ref.current!.entities = entities;
  }, [entities]);

  return <bks-entity-list ref={ref} />;
}
