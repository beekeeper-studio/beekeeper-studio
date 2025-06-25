import { Module } from "vuex";
import Vue from "vue";
import { State as RootState } from "../index";

export interface UserManagementState {
  users: any[];
  selectedUser: any | null;
  hasAdminPrivileges: boolean;
}

export const UserManagementModule: Module<UserManagementState, RootState> = {
  namespaced: true,
  state: () => ({
    users: [],
    selectedUser: null,
    hasAdminPrivileges: false,
  }),
  mutations: {
    setUsers(state, users) {
      state.users = users;
    },
    setSelectedUser(state, user) {
      state.selectedUser = user;
    },
    setHasAdminPrivileges(state, hasAdminPrivileges: boolean) {
      state.hasAdminPrivileges = hasAdminPrivileges;
    },
  },
  actions: {
    async fetchUsers({ commit, rootState }) {
      try {
        const users = await rootState.connection.getListOfUsers();
        const formattedUsers = users.map((user) => ({
          user: user.user || 'anonymous',
          host: user.host || 'localhost',
        }));
        commit('setUsers', formattedUsers);
      } catch (error) {
        // handle error
      }
    },
    async updateUsersList({ dispatch }) {
      try {
        await dispatch('fetchUsers');
      } catch (error) {
        // handle error
      }
    },
    updateSelectedUser({ commit }, user) {
      commit('setSelectedUser', user);
    },
    async setHasAdminPrivileges({ commit }) {
      try {
        const result = await Vue.prototype.$util.send('conn/hasAdminPermission', {});
        commit('setHasAdminPrivileges', result);
      } catch (error) {
        commit('setHasAdminPrivileges', false);
      }
    },
  },
  getters: {
    users: (state) => state.users,
    selectedUser: (state) => state.selectedUser,
    hasAdminPrivileges: (state) => state.hasAdminPrivileges,
  },
};
