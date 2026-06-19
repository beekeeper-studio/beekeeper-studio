import { Module } from "vuex";
import { State as RootState } from '../index';
import _ from 'lodash';
import { IConnection } from "@/common/interfaces/IConnection";
import Vue from 'vue'
import { TransportPinnedConn } from "@/common/transport";

interface State {
  pins: TransportPinnedConn[]
}

export const PinConnectionModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pins: []
  }),
  getters: {
    pinned(state: State): TransportPinnedConn[] {
      return state.pins;
    },
    orderedPins(_state, getters, rootState): TransportPinnedConn[] {
      const connections = rootState['data/connections'].items;
      return getters.pinned.sort((a, b) => a.position - b.position).map((pin: TransportPinnedConn) => {
        const c = connections.find((c) => c.id === pin.connectionId && c.workspaceId === rootState.workspaceId);
        if (c) pin.connection = c;
        return c ? pin : null
      }).filter((p) => !!p);
    },
    pinnedConnections(_state: State, getters, rootState): IConnection[] {
      const connections = rootState['data/connections'].items;
      return getters.orderedPins.map((pin) => connections.find((c) => c.id === pin.connectionId && c.workspaceId === rootState.workspaceId));
    }
  },
  mutations: {
    set(state, pins: TransportPinnedConn[]) {
      state.pins = pins;
    },
    add(state, newPin: TransportPinnedConn) {
      state.pins.push(newPin);
    },
    remove(state, pin: TransportPinnedConn) {
      state.pins = _.without(state.pins, pin);
    }
  },
  actions: {
    async loadPins(context) {
      const pins = await Vue.prototype.$util.send('appdb/pinconn/find', {
        options: {
          where: {
            workspaceId: context.rootState.workspaceId
          }
        }
      });
      context.commit('set', pins || []);
    },
    async unloadPins(context) {
      context.commit('set', []);
    },
    async add(context, item: IConnection) {
      const existing = context.state.pins.find((p) => p.connectionId === item.id && p.workspaceId === context.rootState.workspaceId)
      if (existing) {
        return;
      }

      let newPin = await Vue.prototype.$util.send('appdb/pinconn/new', { init: item });
      newPin.position = (context.getters.orderedPins.reverse()[0]?.position || 0) + 1;
      newPin = await Vue.prototype.$util.send('appdb/pinconn/save', { obj: newPin })
      context.commit('add', newPin);
    },
    async reorder(context) {
      const pins = context.state.pins;
      pins.forEach((p, idx) => p.position = idx);
      context.commit('set', pins)
      await Vue.prototype.$util.send('appdb/pinconn/save', { obj: pins });
    },
    async remove(context, item: IConnection) {
      const existing = context.state.pins.find((p) => p.connectionId === item.id && p.workspaceId === context.rootState.workspaceId);
      if (existing) {
        if (existing.id) await Vue.prototype.$util.send('appdb/pinconn/remove', { obj: existing });
        context.commit('remove', existing);
      }
    }
  },
}
