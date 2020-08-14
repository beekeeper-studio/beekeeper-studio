import tls from 'tls'
import Vue from 'vue'
import VueNoty from 'vuejs-noty'
import VueHotkey from 'v-hotkey'
import VTooltip from 'v-tooltip'
import VModal from 'vue-js-modal'
import 'xel/xel'
import 'codemirror/addon/search/searchcursor'
import Tabulator from 'tabulator-tables'

import App from './App.vue'
import path from 'path'
import 'typeface-roboto'
import 'typeface-source-code-pro'
import './assets/styles/app.scss'
import $ from 'jquery'
import SQL from 'codemirror/mode/sql/sql'
import Hint from 'codemirror/addon/hint/show-hint.js'
import SQLHint from 'codemirror/addon/hint/sql-hint.js'
import store from './store/index'
import 'reflect-metadata'
import {TypeOrmPlugin} from './lib/typeorm_plugin'
import config from './config'
import ConfigPlugin from './plugins/ConfigPlugin'
import { ipcRenderer } from 'electron'
import AppEventHandler from './lib/events/AppEventHandler'
import Connection from './common/appdb/Connection'
import xlsx from 'xlsx'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import log from 'electron-log'
import VueClipboard from 'vue-clipboard2'

(async () => {
  try {
    log.info("starting logging")
    tls.DEFAULT_MIN_VERSION = "TLSv1"
    TimeAgo.addLocale(en)
    Tabulator.prototype.defaultOptions.layout = "fitDataFill";
    const appDb = path.join(config.userDirectory, 'app.db')
    const connection = new Connection(appDb, config.isDevelopment ? true : ['error'])
    await connection.connect()

    window.$ = $
    window.jQuery = $
    window.sql = SQL
    window.hint = Hint
    window.SQLHint = SQLHint
    window.XLSX = xlsx
    Vue.config.devtools = process.env.NODE_ENV === 'development';

    Vue.mixin({
      methods: {
        ctrlOrCmd(key) {
          if (this.$config.isMac) return `meta+${key}`
          return `ctrl+${key}`
        },
        selectChildren(element) {
          window.getSelection().selectAllChildren(
            element
          );
        }
      }
    })

    Vue.config.productionTip = false
    Vue.use(TypeOrmPlugin, {connection})
    Vue.use(VueHotkey)
    Vue.use(VTooltip)
    Vue.use(VModal)
    Vue.use(VueClipboard)
    Vue.use(ConfigPlugin)
    Vue.use(VueNoty, {
      timeout: 2300,
      progressBar: true,
      layout: 'bottomRight',
      theme: 'mint',
      closeWith: ['button', 'click'],
    })

    const app = new Vue({
      render: h => h(App),
      store,
    })
    await app.$store.dispatch('settings/initializeSettings')
    const handler = new AppEventHandler(ipcRenderer, app)
    handler.registerCallbacks()
    app.$mount('#app')
  } catch (err) {
    throw err
    // console.error(err)
  }
})();


