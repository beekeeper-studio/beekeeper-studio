import Vue from 'vue'
import Tabulator from 'tabulator-tables'

export function vueFormatter(component: any) {
  const ComponentClass = Vue.extend(component)
  return (cell: Tabulator.CellComponent, params: any, onRendered) => {

    const instance = new ComponentClass({
      propsData: { cell, params }
    })
    instance.$mount()

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })
    return instance.$el
  }
}

export function vueEditor(component: any) {
  const ComponentClass = Vue.extend(component)

  return (cell:Tabulator.CellComponent, onRendered, success, _cancel, editorParams) => {

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