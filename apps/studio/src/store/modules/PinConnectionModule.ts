import { PinnedConnection, SavedConnection } from "@/lib/utility/ElectronUtilityAppDbClients";
import { Module } from "vuex";
import { State as RootState } from '../index';
import _ from 'lodash';

interface State {
  pins: PinnedConnection[]
}

export const PinConnectionModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pins: []
  }),
  getters: {
    pinned(state: State): PinnedConnection[] {
      return state.pins;
    },
    orderedPins(_state, getters, rootState): PinnedConnection[] {
      const connections = rootState['data/connections'].items;
      return getters.pinned.sort((a, b) => a.position - b.position).map((pin: PinnedConnection) => {
        const c = connections.find((c) => c.id === pin.connectionId && c.workspaceId === rootState.workspaceId);
        if (c) pin.connection = c;
        return c ? pin : null
      }).filter((p) => !!p);
    },
    pinnedConnections(_state: State, getters): SavedConnection[] {
      return getters.orderedPins.map((pin) => pin.connection);
    }
  },
  mutations: {
    set(state, pins: PinnedConnection[]) {
      state.pins = pins;
    },
    add(state, newPin: PinnedConnection) {
      state.pins.push(newPin);
    },
    remove(state, pin: PinnedConnection) {
      state.pins = _.without(state.pins, pin);
    }
  },
  actions: {
    async loadPins(context) {
      const pins = await PinnedConnection.find({
        where: {
          workspaceId: context.rootState.workspaceId
        }
      });
      context.commit('set', pins || []);
    },
    async unloadPins(context) {
      context.commit('set', []);
    },
    async add(context, item: SavedConnection) {
      const existing = context.state.pins.find((p) => p.connectionId === item.id && p.workspaceId === context.rootState.workspaceId)
      if (existing) {
        return;
      }

      const newPin = new PinnedConnection(item);
      newPin.position = (context.getters.orderedPins.reverse()[0]?.position || 0) + 1;
      await newPin.save();
      context.commit('add', newPin);
    },
    async reorder(context) {
      const pins = context.state.pins;
      pins.forEach((p, idx) => p.position = idx);
      context.commit('set', pins)
      await PinnedConnection.save(pins);
    },
    async remove(context, item: SavedConnection) {
      const existing = context.state.pins.find((p) => p.connectionId === item.id && p.workspaceId === context.rootState.workspaceId);
      if (existing) {
        if (existing.id) await existing.remove();
        context.commit('remove', existing);
      }
    }
  },
}
