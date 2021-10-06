import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import _ from 'lodash'
import { Module } from 'vuex'
import { State as RootState } from '../../../index'
import { mutationsFor, DataState } from '../DataModuleBase'

interface State extends DataState<FavoriteQuery> {

}

export const LocalQueryModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null
  },
  mutations: mutationsFor<FavoriteQuery>({
    // more mutations go here
  }),
  actions: {
    async load(context) {
      const items = await FavoriteQuery.find({ order: { createdAt: 'DESC' } })
      context.commit('upsert', items)
    },
    async save(context, query: FavoriteQuery) {
      query.database = context.rootState.database || 'default'
      await query.save()
      // otherwise it's already there!
      context.commit('upsert', query)
      return query
    },
    async remove(context, favorite) {
      await favorite.remove()
      context.commit('remove', favorite)
    },
    async reload(context, query) {
      await query.reload()
      context.commit('upsert', query)
      return query
    }
  }
}