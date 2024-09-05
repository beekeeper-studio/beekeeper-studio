import { uuidv4 } from "@/lib/uuid";
import tmp from "tmp";
import { state } from "./handlerState";
import fs from "fs";
import { TransportTempFile } from "@/common/transport";

export interface ITempHandlers {
  'temp/create': ({ sId }: { sId: string }) => Promise<TransportTempFile>,
  'temp/open': ({ id, sId }: { id: string, sId: string }) => Promise<void>,
  'temp/write': ({ id, content, sId }: { id: string, content: string, sId: string }) => Promise<void>,
  'temp/delete': ({ id, sId }: { id: string, sId: string }) => Promise<void>
}

export const TempHandlers: ITempHandlers = {
  'temp/create': async function({ sId }: { sId: string }) {
    const id = uuidv4();

    const fileObject = tmp.fileSync({ postfix: '.txt' });
    state(sId).tempFiles.set(id, {
      fileObject,
      fileHandle: null
    });

    return {
      id,
      name: fileObject.name
    };
  },
  'temp/open': async function({ id, sId }: { id: string, sId: string }) {
    const fileObject = state(sId).tempFiles.get(id)?.fileObject;

    if (!fileObject) throw new Error("Could not find file");
    const fileHandle = await fs.promises.open(fileObject.name, "w+");

    state(sId).tempFiles.get(id).fileHandle = fileHandle;
  },
  'temp/write': async function({ id, content, sId }: { id: string, content: string, sId: string }) {
    const file = state(sId).tempFiles.get(id);

    if (!file) throw new Error("Could not find file");

    await file.fileHandle.write(content);
  },
  'temp/delete': async function({ id, sId }: { id: string, sId: string }) {
    const file = state(sId).tempFiles.get(id);

    if (!file) throw new Error("Could not find file");
    file.fileObject.removeCallback();
    state(sId).tempFiles.delete(id);
  }
}
