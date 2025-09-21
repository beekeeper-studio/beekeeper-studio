import { FormatterPreset, FormatterPresetValues } from "@/common/appdb/models/FormatterPreset";
import { TransportFormatterPreset } from "@/common/transport/";

export const FormatterPresetHandlers = {
  'formatter/getAll': async (): Promise<TransportFormatterPreset[]> => {
    return await FormatterPreset.getAll()
  },
  'formatter/get': async (identifier: string): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.getFormatterByIdentifier(identifier)
  },
  'formatter/updatePreset': async (id: number, updateValues: FormatterPresetValues): Promise<TransportFormatterPreset> => {
    return await FormatterPreset.updatePreset(id, updateValues)
  },
  'formatter/deletePreset': async (id: number): Promise<void> => {
    return await FormatterPreset.deletePreset(id)
  }
}