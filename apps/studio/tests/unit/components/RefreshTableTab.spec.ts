import { mount } from "@vue/test-utils";
import CoreTabHeader from "@/components/CoreTabHeader.vue";
import TableTable from "@/components/tableview/TableTable.vue";
import Vuex from "vuex";
import Vue from "vue";
import { createLocalVue } from "@vue/test-utils";

const localVue = createLocalVue();
localVue.use(Vuex);
Vue.use(Vuex);

describe('CoreTabHeader.vue', () => {
    let store;

    beforeEach(() => {
      store = new Vuex.Store({
          getters: {
              minimalMode: () => false,
          },
      });
    }); 

    it('double click event is sent on double-click', async () => {
      const tabMock = { id: '1', tabType: 'table', title: 'Test Tab' };
      const wrapper = mount(CoreTabHeader, {
        propsData: {
          tab: tabMock,
          selected: true,
        },
        mocks: {
          $vHotkeyKeymap: jest.fn(() => ({})),
        },
        store,
        localVue,
      });
  
      // simulate double click
      const navLink = wrapper.find('.nav-link');
      await navLink.trigger('dblclick');

  
      // check if double click event was sent
      expect(wrapper.emitted().dblclick).toBeTruthy();
      expect(wrapper.emitted().dblclick[0]).toEqual([tabMock]);
    });
  
    it('loading spinner is shown during refresh', async () => {
      const tabMock = { id: '2', tabType: 'table', title: 'Test Tab' };
      const wrapper = mount(CoreTabHeader, {
        propsData: {
          tab: tabMock,
          selected: true,
        },
        mocks: {
          $vHotkeyKeymap: jest.fn(() => ({})),
        },
        store,
        localVue,
      });
  
      // simulate double click
      const navLink = wrapper.find('.nav-link');
      await navLink.trigger('dblclick');
  
      // check that the loading spinner is visible
      expect(wrapper.vm.$data.isLoading).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
  
      // wait for the loading spinner to disappear
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(wrapper.vm.$data.isLoading).toBe(false);
      expect(wrapper.find('.loading-spinner').exists()).toBe(false);
    });

    it('tabs that are not tables dont refresh with double click', async () => {
        const tabMock = { id: '3', tabType: 'query', title: 'Non-Table Tab' };
        const wrapper = mount(CoreTabHeader, {
          propsData: {
            tab: tabMock,
            selected: true,
          },
          mocks: {
            $vHotkeyKeymap: jest.fn(() => ({})),
          },
          store,
          localVue,
        });
      
        // simulate double click
        const navLink = wrapper.find('.nav-link');
        await navLink.trigger('dblclick');
      
        // check that the loading spinner is not visible
        expect(wrapper.vm.$data.isLoading).toBe(false);
        expect(wrapper.find('.loading-spinner').exists()).toBe(false);
      
      });

      it('shows tooltip on double click to refresh', async () => {
        const tabMock = { id: '4', tabType: 'table', title: 'Tooltip Test Tab' };
        const wrapper = mount(CoreTabHeader, {
          propsData: {
            tab: tabMock,
            selected: true,
          },
          mocks: {
            $vHotkeyKeymap: jest.fn(() => ({})),
          },
          store,
          localVue,
        });

        const navLink = wrapper.find('.nav-item');
        await navLink.trigger('mouseenter');

        // Wait for tooltip to appear
        await new Promise((resolve) => setTimeout(resolve, 1500));

        await wrapper.vm.$nextTick();

        const tooltip = wrapper.find('.tooltip');
        expect(tooltip.exists()).toBe(true);
        expect(tooltip.text()).toBe('Double click to refresh');

        await navLink.trigger('mouseleave');
        expect(wrapper.find('.tooltip').exists()).toBe(false);
      });
  });