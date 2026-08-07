import { FolderNodeModule } from '@/store/modules/data/tree/FolderNodeModule'
import { IFolder } from '@/common/interfaces/IQueryFolder'
import { buildFolderNodes, buildFolderNode } from '@/common/utils/folderTree'

const mutations = FolderNodeModule.mutations

const folder = (id: number, parentId: number, name = '') =>
  ({ id, parentId, name }) as IFolder

function buildState(folders: IFolder[]) {
  return { items: buildFolderNodes(folders) }
}

describe('FolderNodeModule replace mutation', () => {
  it('inserts nodes arriving in the payload', () => {
    const state = buildState([folder(1, 10)])

    mutations.replace(state, {
      items: [folder(1, 10), folder(2, 10)],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([
      buildFolderNode(folder(1, 10)),
      buildFolderNode(folder(2, 10)),
    ])
  })

  it('updates an existing node', () => {
    const state = buildState([folder(1, 10, 'old')])

    mutations.replace(state, {
      items: [folder(1, 10, 'new')],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([buildFolderNode(folder(1, 10, 'new'))])
  })

  it('removes in-scope nodes missing from the payload', () => {
    const state = buildState([folder(1, 10), folder(2, 10)])

    mutations.replace(state, {
      items: [folder(1, 10)],
      replaceIf: (i) => i.parentId === 10,
    })

    expect(state.items).toStrictEqual([buildFolderNode(folder(1, 10))])
  })
})
