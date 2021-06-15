


export class ColumnType {
  public name: string
  public supportsLength: boolean
  public defaultLength: number
  constructor(name: string, supportsLength?: boolean, defaultLength: number = 255) {
    this.name = name
    this.supportsLength = supportsLength
    this.defaultLength = defaultLength
  }

  get pretty() {
    if (this.supportsLength) {
      return `${this.name}(${this.defaultLength})`
    } 
    return this.name
  }
}

export interface DialectData {
  columnTypes: ColumnType[]
}