import { FormatterPreset, FormatterPresetValues } from "@/common/appdb/models/FormatterPreset";
import { TransportFormatterPreset } from "@/common/transport/";

export const formatterPresetHandlers = {
  'appdb/formatter/getAll': async (): Promise<TransportFormatterPreset[]> => {
    return await FormatterPreset.getAll()
  },
  'appdb/formatter/get': async (identifier: string): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.getFormatterByIdentifier(identifier)
  },
  'appdb/formatter/updatePreset': async (id: number, updateValues: FormatterPresetValues): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.updatePreset(id, updateValues)
  },
  'appdb/formatter/deletePreset': async (id: number): Promise<void> => {
    return await FormatterPreset.deletePreset(id)
  }
}