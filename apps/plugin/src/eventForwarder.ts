/** Any events that need to be forwarded to parent/plugin system
 * must go here */

/** FIXME this file must be injected from the plugin system automatically */

import { notify } from ".";
import { WindowEventInits, WindowEventClass } from "./types";

function createEventInit<T>(event: T): {
  eventClass: WindowEventClass;
  eventInitOptions: WindowEventInits;
} {
  if (event instanceof MouseEvent) {
    const eventInitOptions: MouseEventInit = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      movementX: event.movementX,
      movementY: event.movementY,
      detail: event.detail,
    };
    return {
      eventClass: "MouseEvent",
      eventInitOptions,
    };
  }

  if (event instanceof PointerEvent) {
    const eventInitOptions: PointerEventInit = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      movementX: event.movementX,
      movementY: event.movementY,
      detail: event.detail,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
    };
    return {
      eventClass: "PointerEvent",
      eventInitOptions,
    };
  }

  if (event instanceof KeyboardEvent) {
    const isPasswordField =
      (event.target as HTMLInputElement)?.type === "password";

    if (isPasswordField) {
      // Avoid logging keystrokes from password fields
      return {
        eventClass: "KeyboardEvent",
        eventInitOptions: {},
      };
    }

    const eventInitOptions: KeyboardEventInit = {
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      location: event.location,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
    };

    return {
      eventClass: "KeyboardEvent",
      eventInitOptions,
    };
  }

  return {
    eventClass: "Event",
    eventInitOptions: {},
  };
}

const forwardedEvents = [
  "contextmenu",
  "click",
  "dblclick",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "keydown",
  "keypress",
  "keyup",
] as const;

forwardedEvents.forEach((eventType) => {
  document.addEventListener(eventType, (event) => {
    const eventInit = createEventInit(event);
    notify("windowEvent", {
      eventType,
      eventClass: eventInit.eventClass,
      eventInitOptions: eventInit.eventInitOptions,
    });
  });
});
