export interface FolderStructre {
  extension: string[];
  validation: { [key: string]: string };
  rootPath: string;
  rename: { [key: string]: any };
}
