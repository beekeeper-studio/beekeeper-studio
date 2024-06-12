import { Schema } from "@shared/lib/dialects/models";
import { errorMessages, state } from "./handlerState";


export interface IGeneratorHandlers {
  'generator/build': ({ schema }: { schema: Schema }) => Promise<string>
}

export const GeneratorHandlers = {
  'generator/build': async function({ schema }: { schema: Schema }) {
    if (!state.generator) {
      throw new Error(errorMessages.noGenerator);
    }

    return state.generator.buildSql(schema);
  }
}
