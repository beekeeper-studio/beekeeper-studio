import { FormatterPreset, FormatterPresetValues } from "@/common/appdb/models/FormatterPreset";
import { TransportFormatterPreset } from "@/common/transport/";

export const FormatterPresetHandlers = {
  'appdb/formatter/getAll': async (): Promise<TransportFormatterPreset[]> => {
    return await FormatterPreset.getAll()
  },
  'appdb/formatter/get': async ({ identifier }: { identifier: string }): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.getFormatterByIdentifier(identifier)
  },
  'appdb/formatter/updatePreset': async ({ id, updateValues }: { id: number, updateValues: FormatterPresetValues }): Promise<TransportFormatterPreset> => {
    console.log('in update values', id, updateValues)
    return await FormatterPreset.updatePreset(id, updateValues)
  },
  'appdb/formatter/deletePreset': async ({ id }: { id: number }): Promise<void> => {
    return await FormatterPreset.deletePreset(id)
  },
  'appdb/formatter/newPreset': async ( { insertValues }: { insertValues: FormatterPresetValues }): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.addPreset(insertValues)
  }
}