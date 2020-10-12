import tls from 'tls'
import Vue from 'vue'
import VueNoty from 'vuejs-noty'
import VueHotkey from 'v-hotkey'
import VTooltip from 'v-tooltip'
import VModal from 'vue-js-modal'
import 'xel/xel'
import Tabulator from 'tabulator-tables'

import App from './App.vue'
import path from 'path'
import 'typeface-roboto'
import 'typeface-source-code-pro'
import './assets/styles/app.scss'
import $ from 'jquery'
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
import platformInfo from './common/platform_info'

(async () => {
  try {
    log.info("starting logging")
    tls.DEFAULT_MIN_VERSION = "TLSv1"
    TimeAgo.addLocale(en)
    // @ts-ignore
    Tabulator.prototype.defaultOptions.layout = "fitDataFill";
    const appDb = platformInfo.appDbPath
    const connection = new Connection(appDb, config.isDevelopment ? true : ['error'])
    await connection.connect();

    (window as any).$ = $;
    (window as any).jQuery = $;
    (window as any).XLSX = xlsx;
    Vue.config.devtools = platformInfo.isDevelopment;

    Vue.mixin({
      methods: {
        ctrlOrCmd(key) {
          if (this.$config.isMac) return `meta+${key}`
          return `ctrl+${key}`
        },
        selectChildren(element) {
          const selection = window.getSelection()
          if (selection) {
            selection.selectAllChildren(
              element
            );
          }
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


