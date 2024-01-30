import { escapeHtml } from '@shared/lib/tabulator'
import Noty from 'noty'

const defaults = {
  timeout: 2300,
  progressBar: true,
  layout: 'bottomRight',
  theme: 'mint',
  closeWith: ['button', 'click'],
}

const VueNoty = {
  options: {},

  setOptions(opts) {
    this.options = Object.assign({}, defaults, opts)
    return this
  },

  create(params) {
    return new Noty(params)
  },

  show(text, type = 'alert', opts: { allowRawHtml?: boolean } = {}) {
    const params = Object.assign({}, this.options, opts, {
      type,
      text: opts.allowRawHtml ? text : escapeHtml(text)
    })

    const noty = this.create(params)
    noty.show()
    return noty
  },

  success(text, opts = {}) {
    return this.show(text, 'success', opts)
  },

  error(text, opts = {}) {
    return this.show(text, 'error', opts)
  },

  warning(text, opts = {}) {
    return this.show(text, 'warning', opts)
  },

  info(text, opts = {}) {
    return this.show(text, 'info', opts)
  }
}

export default {
  install: function (Vue, opts) {
    const noty = VueNoty.setOptions(opts)
    Vue.prototype.$noty = noty
    Vue.noty = noty
  }
}
