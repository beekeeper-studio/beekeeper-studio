export interface DropzoneEnterEvent {
  event: DragEvent;
  files: File[];
  preventDrop: () => void;
}

export interface DropzoneDropEvent {
  event: DragEvent;
  files: File[];
}

