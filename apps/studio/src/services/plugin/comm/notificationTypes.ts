export interface ThemeChangedNotification {
  name: "themeChanged";
}

// whether the suggestion is accepted or rejected
export interface SuggestionResultNotification {
  name: "suggestionResult";
  suggestionId: number;
  accepted: boolean;
}

export type PluginNotificationData = ThemeChangedNotification | SuggestionResultNotification;

