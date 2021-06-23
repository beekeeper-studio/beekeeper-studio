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

  return (cell:Tabulator.CellComponent, onRendered, success, cancel, editorParams) => {

    const instance = new ComponentClass({
      propsData: {cell, params: editorParams}
    })

    // this is important otherwise we bleed both event listeners
    // and memory!
    const off = () => {
      instance.$off()
      instance.$destroy()
    }

    instance.$on('value', (v) => {
      success(v)
      off()
    })

    instance.$on('cancel', () => {
      cancel()
      off()
    })

    instance.$mount()

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })



    return instance.$el
  }
}