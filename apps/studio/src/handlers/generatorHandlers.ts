import { Schema } from "@shared/lib/dialects/models";
import { errorMessages, state } from "./handlerState";

export interface IGeneratorHandlers {
  'generator/build': ({ schema, sId }: { schema: Schema, sId: string }) => Promise<string>
}

export const GeneratorHandlers = {
  'generator/build': async function({ schema, sId }: { schema: Schema, sId: string }) {
    if (!state(sId).generator) {
      throw new Error(errorMessages.noGenerator);
    }

    return state(sId).generator.buildSql(schema);
  }
}
