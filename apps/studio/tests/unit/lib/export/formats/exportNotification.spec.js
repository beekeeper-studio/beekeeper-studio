import Vue from 'vue'
import ExportManager from '@/components/export/ExportManager.vue'

describe('ExportManager.vue', () => {
  it('should show an error message when export fails', async () => {
    const registerHandlersMock = jest.fn()
    const errorMock = jest.fn()
    Vue.prototype.$noty = { error: errorMock }
    const sendMock = jest.fn().mockRejectedValue(new Error('Export failed'))
    Vue.prototype.$util = { send: sendMock }
    const Constructor = Vue.extend(ExportManager)
    const vm = new Constructor().$mount()
    vm.registerHandlers = registerHandlersMock
    await vm.startExport({ table: { name: 'Test Table' } })
    expect(errorMock).toHaveBeenCalledWith(
      'Failed to export: Export failed',
      expect.objectContaining({})  
    )
  })
})
