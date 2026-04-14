import { Column, Entity } from "typeorm"
import { ApplicationEntity } from "./application_entity"
import _ from "lodash"
import rawLog from "@bksLogger"
import { FormatterPresetConfig, TransportFormatterPreset } from "@/common/transport"

const log = rawLog.scope("FormatterPresets")

export type FormatterPresetValues = {
  name: string,
  config: FormatterPresetConfig,
  systemDefault: boolean
}

@Entity({ name: "formatter_presets" })
export class FormatterPreset extends ApplicationEntity {
  withProps(props: any) {
    if (props) FormatterPreset.merge(this, props)
    return this
  }

  @Column({ type: "varchar", nullable: false })
  name: string

  @Column({ type: "varchar", nullable: false })
  config: string

  @Column({ type: "integer", nullable: false })
  systemDefault: number

  static async getAll(): Promise<TransportFormatterPreset[]> {
    const results = await this.find({
      order: {
        id: 'DESC'
      }
    })
    return results.map(store => ({
      ...store,
        config: JSON.parse(store.config),
        systemDefault: Boolean(store.systemDefault)
    }))
  }

  static async getFormatterByIdentifier(identifier): Promise<TransportFormatterPreset> {
    const whereClause = _.isNumber(identifier) ? { id: identifier } : { name: identifier }
    try {
      const store = await this.findOne({ where: whereClause })

      if (!store) return null
      return {
        ...store,
        config: JSON.parse(store.config),
        systemDefault: Boolean(store.systemDefault)
      }
    } catch (e) {
      log.error(`Failed parsing config data. identifier: ${identifier}.`, e)
      return null
    }
  }

  static async addPreset(insertValues: FormatterPresetValues): Promise<TransportFormatterPreset>{
    const { name, config } = insertValues
    try {
      const formatterValues = new FormatterPreset()
      formatterValues.config = JSON.stringify(config),
      formatterValues.name = name
      formatterValues.systemDefault = 0
      const savedFormat = await formatterValues.save()
      return {
        ...savedFormat,
        config: JSON.parse(savedFormat.config),
        systemDefault: Boolean(savedFormat.systemDefault)
      }
    } catch (e) {
      log.error(`Error adding new preset`, e)
      throw new Error(`Error adding new preset`)
    }
  }

  static async updatePreset(id: number, updateValues: FormatterPresetValues): Promise<TransportFormatterPreset>{
    const existing = await this.findOne({ where: { id } })
    const { config } = updateValues
    try {
      if (!existing) throw new Error('Preset not found')
      existing.config = JSON.stringify(config)
      const savedFormat = await existing.save()
      return {
        ...savedFormat,
        config: JSON.parse(savedFormat.config),
        systemDefault: Boolean(savedFormat.systemDefault)
      }
    } catch (e) {
      log.error(`Error updating preset id: ${id}`, e)
      throw new Error(`Error updating preset id: ${id}`)
    }
  }

  static async deletePreset(id: number): Promise<void> {
    try {
      const result = await this.delete(id)
      if (result.affected === 0) {
        throw new Error(`Preset not found: ${id}`);
      }
      return
    } catch (e) {
      log.error(`Error deleting preset id: ${id}`, e)
      throw new Error(`Error deleting preset id: ${id}`)
    }
  }
}
