/**
 * Generic drag-and-drop contract for dragging database entities (tables,
 * views, ...) from the sidebar onto drop targets such as plugin views.
 *
 * The payload travels on the native `DataTransfer` under a custom MIME type so
 * any drop target in the app can recognise an entity drag and read its data.
 */

export const ENTITY_DRAG_MIME = "application/x-bks-entities";

export interface DraggedEntity {
  name: string;
  schema?: string;
  entityType: string;
}

/** Notification delivered to a plugin view when entities are dropped onto it. */
export type EntitiesDroppedNotification = {
  name: "entitiesDropped";
  args: { entities: DraggedEntity[] };
};

export function setEntityDragData(
  dataTransfer: DataTransfer,
  entities: DraggedEntity[]
): void {
  dataTransfer.setData(ENTITY_DRAG_MIME, JSON.stringify(entities));
  // Fallback so dropping onto the query editor or other text targets inserts
  // the entity name(s).
  dataTransfer.setData("text/plain", entities.map((e) => e.name).join(", "));
  // copyMove keeps Sortable's reorder (move) valid while still allowing copy
  // onto external drop targets like plugin views.
  dataTransfer.effectAllowed = "copyMove";
}

export function hasEntityDragData(dataTransfer: DataTransfer | null): boolean {
  return !!dataTransfer && Array.from(dataTransfer.types).includes(ENTITY_DRAG_MIME);
}

export function getEntityDragData(
  dataTransfer: DataTransfer | null
): DraggedEntity[] | null {
  if (!dataTransfer) {
    return null;
  }
  const raw = dataTransfer.getData(ENTITY_DRAG_MIME);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
