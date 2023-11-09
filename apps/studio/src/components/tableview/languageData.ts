export interface LanguageData {
  isValid: (raw: string) => boolean;
  beautify: (raw: string) => string;
  minify: (beautified: string) => string;
  name: string;
}

export const Languages: LanguageData[] = [
  {
    name: "json",
    isValid: (value: string) => {
      try {
        JSON.parse(value);

        return true;
      } catch (e) {
        return false;
      }
    },
    beautify: (value: string) => {
      return JSON.stringify(JSON.parse(value), null, 2);
    },
    minify: (value: string) => {
      return JSON.stringify(JSON.parse(value));
    },
  },
];
