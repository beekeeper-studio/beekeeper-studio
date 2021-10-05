import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import _ from 'lodash'
import { Module } from 'vuex'
import { State as RootState } from '../../../index'
import { QueryModuleState, StateAndMutations } from './BaseQueryModule'


export const LocalQueryModule: Module<QueryModuleState, RootState> = {
  namespaced: true,
  ...StateAndMutations,
  actions: {
    async load(context) {
      const items = await FavoriteQuery.find({ order: { createdAt: 'DESC' } })
      context.commit('replace', items)
    },
    async save(context, query: FavoriteQuery) {
      query.database = context.rootState.database || 'default'
      await query.save()
      // otherwise it's already there!
      context.commit('add', query)
      return query
    },
    async remove(context, favorite) {
      await favorite.remove()
      context.commit('remove', favorite)
    },
    async reload(_context, query) {
      await query.reload()
      return query
    }
  }
}