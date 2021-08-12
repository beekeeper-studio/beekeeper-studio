import { getRepository } from "typeorm";

export function selectConnection(alias: string, entity: any) {
  return getRepository(entity).createQueryBuilder(alias);
}

export function isAlreadyIn(arr: any[], node: any) {

  const result = arr.filter(el => {
    if (el.title === node.title) return el
  })

  if (result.length > 0) {
    return true
  }

  return false

}
