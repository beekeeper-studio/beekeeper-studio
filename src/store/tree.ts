export interface FolderStructre {
  extension: string[];
  validation: { [key: string]: string };
  nodeActions: { [key: string]: any };
  workspace: { [key: string]: any };
  directories: any;
  files: {[key:string]: any};
}
