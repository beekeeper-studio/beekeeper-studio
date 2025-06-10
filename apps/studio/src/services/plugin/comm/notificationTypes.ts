import { ThemeType, WindowEventInits, WindowEventClass } from "./commonTypes";

export interface ThemeChangedNotification {
  name: "themeChanged";
  args: {
    palette: Record<string, string>;
    cssString: string;
    type: ThemeType;
  };
}

export interface WindowEventNotification {
  name: "windowEvent";
  args: {
    eventType: string;
    eventClass: WindowEventClass;
    eventInitOptions: WindowEventInits;
  };
}

export type PluginNotificationData =
  | ThemeChangedNotification
  | WindowEventNotification;
