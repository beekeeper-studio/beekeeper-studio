import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import ISavedQuery from '@/common/interfaces/ISavedQuery'
import _ from 'lodash'
import { Module } from 'vuex'
import { State as RootState } from '../../index'
import { DataModuleState, StateAndMutations } from './BaseDataModule'


export const LocalDataModule: Module<DataModuleState, RootState> = {
  namespaced: true,
  ...StateAndMutations,
  actions: {
    async load(context) {
      const items = await FavoriteQuery.find({ order: { createdAt: 'DESC' } })
      context.commit('queriesReplace', items)
    },
    async save(context, query: FavoriteQuery) {
      query.database = context.rootState.database || 'default'
      await query.save()
      // otherwise it's already there!
      if (!context.state.savedQueries.includes(query)) {
        context.commit('queriesAll', query)
      }
    },
    async remove(context, favorite) {
      await favorite.remove()
      context.commit('queriesRemove', favorite)
    },
  }
}