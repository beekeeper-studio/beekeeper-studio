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

(async () => {

  await window.main.requestPlatformInfo();
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
          if (this.$config.isMac) return `meta+${key}`
          return `ctrl+${key}`
        },
        // codemirror sytax
        cmCtrlOrCmd(key: string) {
          if (this.$config.isMac) return `Cmd-${key}`
          return `Ctrl-${key}`
        },
        ctrlOrCmdShift(key) {
          if (this.$config.isMac) return `meta+shift+${key}`
          return `ctrl+shift+${key}`
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


    Vue.config.productionTip = false
    Vue.use(VueHotkey)
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

    const app = new Vue({
      render: h => h(App),
      store,
    })

    Vue.prototype.$util = new UtilityConnection();
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
    app.$mount('#app')
  } catch (err) {
    console.error("ERROR INITIALIZING APP")
    console.error(err)
    throw err
  }
})();
