import Vue from 'vue'
import Tabulator from 'tabulator-tables'

export function vueEditor(component: any) {
  const ComponentClass = Vue.extend(component)
  return (cell:Tabulator.CellComponent, onRendered, success, _cancel, editorParams) => {
    console.log("rendering component")
    const instance = new ComponentClass({
      propsData: {cell, params: editorParams}
    })
    instance.$on('value', (v) => {
      success(v)
    })
    instance.$mount()

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })



    return instance.$el
  }
}