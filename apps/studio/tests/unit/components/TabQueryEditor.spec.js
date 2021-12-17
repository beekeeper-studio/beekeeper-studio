import 'xel/xel'

import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import vToolTip from 'v-tooltip'
import vhotkey from 'v-hotkey'
import vmodal from 'vue-js-modal'
import TabQueryEditor from '../../../src/components/TabQueryEditor.vue'
import { Dialects } from '@shared/lib/dialects/models'


const namedDialects = Dialects.map((dialect) => {
  return { name: dialect }
})

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(vToolTip)
localVue.use(vhotkey)
localVue.use(vmodal)


describe('Query Editor Component', () => {
  
  describe.each(namedDialects)("With dialect $name", ({ name }) => {
    
    let store
    let component
    beforeEach(() => {
      const getters = {
        dialect: () => name
      }
      store = new Vuex.Store({
        state: {
          tables: [],
        },
        modules: {
          'data/queries': {
            namespaced: true,
            state: {
              items: []
            }
          }
        },
        getters
      })

      component = shallowMount(TabQueryEditor, { 
        store, 
        localVue,
        attachTo: document.body,
        propsData: {
          tab: { query: { id: 1}}
        }
       })
    })

    it(`Should be able to format sql for ${name}`, () => {
      const setValue = jest.fn()
      const getValue = jest.fn(x => "select 1")
      component
      component.setData({
        editor: {
          setValue, getValue, getSelection: jest.fn()
        }
      });

      component.formatSql()
      expect(setValue.mock.calls.length).toBe(1)
      expect(setValue.mock.calls[0][0]).toBe("select 1")

    })
  })

})