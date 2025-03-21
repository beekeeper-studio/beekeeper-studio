let contextMenuContainer: string;

export function setContextMenuContainer(element: string) {
  contextMenuContainer = element;
}

export function getContextMenuContainer() {
  return contextMenuContainer || 'body';
}
