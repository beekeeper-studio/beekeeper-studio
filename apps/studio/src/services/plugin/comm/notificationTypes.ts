import { ThemeType } from "./commonTypes";

export interface ThemeChangedNotification {
  name: "themeChanged";
  args: {
    palette: Record<string, string>;
    cssString: string;
    type: ThemeType;
  };
}

export type PluginNotificationData = ThemeChangedNotification;

