import { HasId } from "@/common/interfaces/IGeneric";
import { CloudError, res, url } from "@/lib/cloud/ClientHelpers";
import { AxiosInstance } from "axios";

interface Changes {
  changed: number
  deleted: number
}

// function unixtime(date:Date): number {
//   return (date.getTime() / 1000)
// }

export abstract class GenericController<T extends HasId> {
  constructor(protected axios: AxiosInstance) {

  }

  path: string
  name: string
  plural: string

  async list(updatedSince?: number): Promise<T[]> {
    const params = updatedSince ? {
      updated_since: updatedSince,
      slim: true
    } : { slim: true }
    const response = await this.axios.get(url(this.path), { params })
    return res(response, this.plural)
  }

  async changed(updatedSince: number): Promise<Changes> {
    const params = { updated_since: updatedSince }
    const response = await this.axios.get(url(this.path, 'changed'), { params })
    return res(response, this.plural)
  }

  async get(id: number): Promise<T> {
    const response = await this.axios.get(url(this.path, id))
    return res(response, this.name)
  }

  async create(q: T): Promise<T> {
    if (q.id) throw new CloudError(400, `Cannot create ${this.name} - it already has an ID`)

    const response = await this.axios.post(url(this.path), q)
    return res(response, this.name)
  }

  async update(q: T): Promise<T> {
    if (!q.id) throw new CloudError(400, `Must provide ID to update ${this.name}.`)
    const response = await this.axios.patch(url(this.path, q.id), q)
    return res(response, this.name)
  }

  async upsert(q: T): Promise<T> {
    const method = q.id ? this.update.bind(this) : this.create.bind(this)
    return await method(q)
  }

  async delete(q: T): Promise<boolean> {
    if (!q.id) throw new CloudError(400, `Cannot delete ${this.name} without an ID`)
    const response = await this.axios.delete(url(this.path, q.id))
    return res(response, 'success')
  }
}
