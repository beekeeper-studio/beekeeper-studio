// Uint8Array pollyfills https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
import 'core-js/actual/typed-array/from-base64'
import 'core-js/actual/typed-array/from-hex'
import 'core-js/actual/typed-array/to-base64'
import 'core-js/actual/typed-array/to-hex'

import Vue from 'vue'
import VueHotkey from 'v-hotkey'
import VModal from 'vue-js-modal'
import VTooltip from 'v-tooltip'
import 'xel/xel'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import '@/filters/pretty-bytes-filter'
import PortalVue from 'portal-vue'
import 'typeface-roboto'
import 'typeface-source-code-pro'
import '@/assets/styles/app.scss'
import $ from 'jquery'
import store from '@/store/index'
import ConfigPlugin from '@/plugins/ConfigPlugin'
import { VueElectronPlugin } from '@/lib/NativeWrapper'
import AppEventHandler from '@/lib/events/AppEventHandler'
import xlsx from 'xlsx'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import VueClipboard from 'vue-clipboard2'
import { AppEventMixin } from '@/common/AppEvent'
import BeekeeperPlugin from '@/plugins/BeekeeperPlugin'
import _ from 'lodash'
import NotyPlugin from '@/plugins/NotyPlugin'
import '@/common/initializers/big_int_initializer.ts'
import SettingsPlugin from '@/plugins/SettingsPlugin'
import rawLog from '@bksLogger'
import { HeaderSortTabulatorModule } from '@/plugins/HeaderSortTabulatorModule'
import { KeyListenerTabulatorModule } from '@/plugins/KeyListenerTabulatorModule'
import { UtilityConnection } from '@/lib/utility/UtilityConnection'
import { VueKeyboardTrapDirectivePlugin } from '@pdanpdan/vue-keyboard-trap';
import App from '@/App.vue'
import { ForeignCacheTabulatorModule } from '@/plugins/ForeignCacheTabulatorModule'
import { WebPluginManager } from '@/services/plugin/web'
import PluginStoreService from '@/services/plugin/web/PluginStoreService'
import * as UIKit from '@beekeeperstudio/ui-kit'
import ProductTourPlugin from '@/plugins/ProductTourPlugin'

(async () => {

  await window.main.requestPlatformInfo();
  await window.main.requestBksConfigSource();
  rawLog.transports.console.level = "info"
  const log = rawLog.scope("main.ts")
  log.info("starting logging")

  try {

    log.debug("APP BOOTING")
    log.debug("####################################")
    log.debug("Platform Information (App)")
    log.debug(JSON.stringify(window.platformInfo, null, 2))

    _.mixin({
      'deepMapKeys': function (obj, fn) {

        const x = {};

        _.forOwn(obj, function (rawV, k) {
          let v = rawV
          if (_.isPlainObject(v)) {
            v = _.deepMapKeys(v, fn);
          } else if (_.isArray(v)) {
            v = v.map((item) => _.deepMapKeys(item, fn))
          }
          x[fn(v, k)] = v;
        });

        return x;
      }
    });

    UIKit.setClipboard(
      new (class extends EventTarget implements Clipboard {
        async writeText(text: string) {
          window.main.writeTextToClipboard(text)
        }
        async readText() {
          return window.main.readTextFromClipboard()
        }
        async read(): Promise<ClipboardItem[]> {
          throw new Error("Not implemented")
        }
        async write(_items: ClipboardItem[]) {
          throw new Error("Not implemented")
        }
      })()
    );

    window.main.setTlsMinVersion("TLSv1");
    TimeAgo.addLocale(en)
    Tabulator.defaultOptions.layout = "fitDataFill";
    Tabulator.defaultOptions.popupContainer = ".beekeeper-studio-wrapper";
    Tabulator.defaultOptions.headerSortClickElement = 'icon';
    Tabulator.registerModule([HeaderSortTabulatorModule, KeyListenerTabulatorModule, ForeignCacheTabulatorModule]);
    // Tabulator.prototype.bindModules([EditModule]);

    (window as any).$ = $;
    (window as any).jQuery = $;
    // (window as any).sql = SQL;
    // (window as any).hint = Hint;
    // (window as any).SQLHint = SQLHint;
    (window as any).XLSX = xlsx;
    Vue.config.devtools = window.platformInfo.isDevelopment;
    // @ts-ignore
    // window.platformInfo = window.main.platformInfo
    Vue.mixin(AppEventMixin)
    Vue.mixin({
      methods: {
        ctrlOrCmd(key) {
          const keys = key.split('+');
          // First letter is uppercase
          key = keys.map(k => _.upperFirst(k)).join('+');
          if (this.$config.isMac) return `Meta+${key}`
          return `Ctrl+${key}`
        },
        // codemirror sytax
        cmCtrlOrCmd(key: string) {
          const keys = key.split('-');
          // First letter is uppercase
          key = keys.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('-');
          if (this.$config.isMac) return `Cmd-${key}`
          return `Ctrl-${key}`
        },
        ctrlOrCmdShift(key) {
          const keys = key.split('+');
          // First letter is uppercase
          key = keys.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+');
          if (this.$config.isMac) return `Meta+Shift+${key}`
          return `Ctrl+Shift+${key}`
        },
        selectChildren(element) {
          const selection = window.getSelection()
          if (selection) {
            selection.selectAllChildren(
              element
            );

          } else {
            console.log("no selection")
          }
        },

      }
    })

    const utility = new UtilityConnection()

    Vue.config.productionTip = false
    Vue.use(VueHotkey, {
      "pageup": 33,
      "pagedown": 34
    })
    Vue.use(VTooltip, { defaultHtml: false, })
    Vue.use(VModal)
    Vue.use(VueClipboard)
    Vue.use(ConfigPlugin)
    Vue.use(BeekeeperPlugin)
    Vue.use(SettingsPlugin)
    Vue.use(VueElectronPlugin)
    Vue.use(PortalVue)
    Vue.use(NotyPlugin, {
      timeout: 2300,
      progressBar: true,
      layout: 'bottomRight',
      theme: 'mint',
      closeWith: ['button', 'click'],
    })
    Vue.use(VueKeyboardTrapDirectivePlugin)
    Vue.use(ProductTourPlugin, { store, utility })

    const app = new Vue({
      render: h => h(App),
      store,
    })

    Vue.prototype.$util = utility;
    window.main.attachPortListener();
    window.onmessage = (event) => {
      if (event.source === window && event.data.type === 'port') {
        const [port] = event.ports;
        const { sId } = event.data;
        log.log('Received port in renderer with sId: ', sId);

        Vue.prototype.$util.setPort(port, sId);
        app.$store.dispatch('settings/initializeSettings');
      }
    }

    const handler = new AppEventHandler(app)
    handler.registerCallbacks()
    await store.dispatch('initRootStates')
    const webPluginManager = new WebPluginManager({
      utilityConnection: Vue.prototype.$util,
      pluginStore: new PluginStoreService(store, {
        emit: (...args) => app.$root.$emit(...args),
        on: (...args) => app.$root.$on(...args),
        off: (...args) => app.$root.$off(...args),
      }),
      appVersion: window.platformInfo.appVersion,
      fileHelpers: window.main.fileHelpers,
      noty: Vue.prototype.$noty,
      confirm: app.$confirm.bind(app),
    });
    webPluginManager.initialize().then(() => {
      store.commit("webPluginManagerStatus", "ready")
    }).catch((e) => {
      log.error("Error initializing web plugin manager", e)
      store.commit("webPluginManagerStatus", "failed-to-initialize")
    })
    Vue.prototype.$plugin = webPluginManager;
    Vue.prototype.$bksPlugin = webPluginManager;
    window.bksPlugin = webPluginManager; // For debugging
    app.$mount('#app')
  } catch (err) {
    console.error("ERROR INITIALIZING APP")
    console.error(err)
    throw err
  }
})();
