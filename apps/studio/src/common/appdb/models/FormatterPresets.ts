import { Column, Entity } from "typeorm"
import { ApplicationEntity } from "./application_entity"
import _ from "lodash"
import rawLog from "@bksLogger"

const log = rawLog.scope("FormatterPresets")
type Config = { [key: string]: any }
type PresetValues = { 
  name: string,
  config: Config,
  systemDefault: boolean
}

@Entity({ name: "formatter_presets" })
export class FormatterPresets extends ApplicationEntity {
  withProps(props: any) {
    if (props) FormatterPresets.merge(this, props)
    return this
  }

  @Column({ type: "varchar", nullable: false })
  name: string

  @Column({ type: "varchar", nullable: false })
  config: string

  @Column({ type: "integer", nullable: false })
  systemDefault: number

  static async get(identifier: string|number): Promise<PresetValues | null> {
    const whereClause = _.isNumber(identifier) ? { id: identifier } : { name: identifier }
    const store = await this.findOne({ where: whereClause })

    if (!store) return null
    try {
      return {
        name: store.name,
        config: JSON.parse(store.config),
        systemDefault: Boolean(store.systemDefault)
      }
    } catch (e) {
      log.error(`Failed parsing config data. identifier: ${identifier}.`, e)
      return null
    }
  }

  static async set(id: number, values: PresetValues) {
    const existing = await this.findOne({ where: { id } })
    const { name, config } = values
    if (existing) {
      existing.config = JSON.stringify(config)
      existing.name = name
      await existing.save()
      return
    }
    const data = new this()
    data.name = name
    data.config = JSON.stringify(config)
    await data.save()
  }
}
