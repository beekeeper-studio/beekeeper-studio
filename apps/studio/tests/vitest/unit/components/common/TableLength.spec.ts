import { beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import TableLength from '@/components/common/TableLength.vue';
import store from '@/store';
import { createConfig } from '@tests/vitest/integration/utils/config';

const flushPromises = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
};

describe('TableLength.vue', () => {
  const table = { name: 'orders', schema: 'public', entityType: 'table' };
  let getTableLength: ReturnType<typeof vi.fn>;
  let getFilteredDataCount: ReturnType<typeof vi.fn>;
  let getQueryForFilter: ReturnType<typeof vi.fn>;

  function mountTableLength({
    filters = [],
    autoFetchRowCount = false,
  }: {
    filters?: unknown;
    autoFetchRowCount?: boolean;
  } = {}) {
    const $bksConfig = createConfig();
    $bksConfig.ui.tableTable.autoFetchRowCount = autoFetchRowCount;

    return shallowMount(TableLength, {
      store,
      propsData: {
        table,
        filters,
      },
      directives: {
        tooltip: () => {},
      },
      mocks: {
        $bksConfig,
      },
    });
  }

  beforeEach(async () => {
    getTableLength = vi.fn().mockResolvedValue(1234);
    getFilteredDataCount = vi.fn().mockResolvedValue(12);
    getQueryForFilter = vi.fn().mockResolvedValue("status = 'open'");

    store.commit('clearConnection');
    store.commit('database', 'main_db');
    store.commit('connected', true);
    store.commit('newConnection', {
      id: 1,
      connectionType: 'postgresql',
      defaultDatabase: 'main_db',
    });
    store.state.connection = {
      getTableLength,
      getFilteredDataCount,
      getQueryForFilter,
    } as any;
    await store.dispatch('tableLengths/clear');
  });

  it('shows Unknown initially when autoFetchRowCount is false and shares fetched count across views with a cached indicator', async () => {
    const dataView = mountTableLength();
    await Vue.nextTick();

    expect(getTableLength).not.toHaveBeenCalled();
    expect(dataView.text()).toContain('Unknown');

    await dataView.trigger('click');
    await flushPromises();

    expect(getTableLength).toHaveBeenCalledTimes(1);
    expect(dataView.text()).toContain('~1,234');
    expect(dataView.find('.cached-indicator').exists()).toBe(false);
    expect((dataView.vm as any).hoverTitle).toBe('Approximately 1,234 Records (click to refresh)');

    const structureView = mountTableLength();
    await flushPromises();

    expect(getTableLength).toHaveBeenCalledTimes(1);
    expect(structureView.text()).toContain('~1,234');
    expect(structureView.find('.cached-indicator').exists()).toBe(true);
    expect((structureView.vm as any).hoverTitle).toBe('Approximately 1,234 Records (cached - click to refresh)');

    getTableLength.mockResolvedValueOnce(1250);
    await structureView.trigger('click');
    await flushPromises();

    expect(getTableLength).toHaveBeenCalledTimes(2);
    expect(structureView.text()).toContain('~1,250');
    expect(structureView.find('.cached-indicator').exists()).toBe(false);
    expect(dataView.text()).toContain('~1,250');
    expect(dataView.find('.cached-indicator').exists()).toBe(true);

    await store.dispatch('tableLengths/invalidate', table);
    await Vue.nextTick();
    expect(dataView.text()).toContain('Unknown');
    expect(structureView.text()).toContain('Unknown');
  });

  it('keeps filtered counts isolated from the shared unfiltered cache', async () => {
    await store.dispatch('tableLengths/setCount', { table, count: 500 });

    const filteredView = mountTableLength({
      filters: [{ field: 'status', type: '=', value: 'open' }],
    });
    await Vue.nextTick();

    expect(filteredView.text()).toContain('Unknown');
    await filteredView.trigger('click');
    await flushPromises();

    expect(getFilteredDataCount).toHaveBeenCalledTimes(1);
    expect(filteredView.text()).toContain('~12');
    expect(filteredView.find('.cached-indicator').exists()).toBe(false);
    expect(store.getters['tableLengths/getEntry'](table)?.count).toBe(500);

    await filteredView.setProps({ filters: [] });
    await Vue.nextTick();

    expect(filteredView.text()).toContain('~500');
    expect(filteredView.find('.cached-indicator').exists()).toBe(true);
  });

  it('supports raw SQL string filters without overwriting the shared cache', async () => {
    const filteredView = mountTableLength({ filters: "status = 'open'" });
    await Vue.nextTick();

    await filteredView.trigger('click');
    await flushPromises();

    expect(getFilteredDataCount).toHaveBeenCalledWith('orders', 'public', "status = 'open'");
    expect(filteredView.text()).toContain('~12');
    expect(store.getters['tableLengths/getEntry'](table)).toBeNull();
  });

  it('auto-fetches on mount only when autoFetchRowCount is enabled, unfiltered, and not cached', async () => {
    const autoView = mountTableLength({ autoFetchRowCount: true });
    await flushPromises();

    expect(getTableLength).toHaveBeenCalledTimes(1);
    expect(autoView.text()).toContain('~1,234');

    const secondView = mountTableLength({ autoFetchRowCount: true });
    await flushPromises();

    expect(getTableLength).toHaveBeenCalledTimes(1);
    expect(secondView.find('.cached-indicator').exists()).toBe(true);

    const filteredAutoView = mountTableLength({
      autoFetchRowCount: true,
      filters: "id > 0",
    });
    await flushPromises();
    expect(getTableLength).toHaveBeenCalledTimes(1);
    expect(getFilteredDataCount).not.toHaveBeenCalled();
    expect(filteredAutoView.text()).toContain('Unknown');
  });
});
