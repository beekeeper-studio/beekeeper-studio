import { IFolder } from "@/common/interfaces/IQueryFolder";
import { ActionTree } from "vuex";
import { DataState } from "./DataModuleBase";

export const actions: ActionTree<DataState<IFolder>, {}> = {
  async create(context, parentId = null) {
    const siblings = context.state.items.filter(
      (item) => parentId == item.parentId
    );
    let name = "Untitled folder";
    let counter = 1;
    for (const sibling of siblings) {
      if (sibling.name !== name) {
        break;
      }
      name = `Untitled folder ${counter++}`;
    }
    return await context.dispatch("save", { name, parentId });
  },
};
