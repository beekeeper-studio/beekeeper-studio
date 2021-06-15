import Vue from 'vue'
import Tabulator from 'tabulator-tables'

export function vueEditor(component: any) {
  return (cell:Tabulator.CellComponent, onRendered, success, _cancel, editorParams) => {
    const ComponentClass = Vue.extend(component)
    const instance = new ComponentClass({
      propsData: {cell, ...editorParams}
    })

    instance.$mount()
    instance.$on('value', (v) => {
      console.log('received value', v)
      success(v)
    })

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })


    return instance.$el
  }
}