import Vue from 'vue'
import VueNoty from 'vuejs-noty'
import VueHotkey from 'v-hotkey'
import VTooltip from 'v-tooltip'
import VModal from 'vue-js-modal'
import Vueable from '@sagalbot/vueable'
import App from './App.vue'
import path from 'path'
import 'typeface-roboto'
import 'typeface-source-code-pro'
import './assets/styles/vendor.scss'
import './assets/styles/app.scss'
import $ from 'jquery';
import SQL from 'codemirror/mode/sql/sql'
import Hint from 'codemirror/addon/hint/show-hint.js'
import SQLHint from 'codemirror/addon/hint/sql-hint.js'
import store from './store/index'
import 'reflect-metadata'
import {createConnection} from "typeorm";
import {SavedConnection} from './entity/saved_connection'
import {UsedConnection} from './entity/used_connection'
import {UsedQuery} from './entity/used_query'
import {FavoriteQuery} from './entity/favorite_query'
import {TypeOrmPlugin} from './lib/typeorm_plugin'
import config from './config'
import {Subscriber as EncryptedColumnSubscriber} from 'typeorm-encrypted-column'
import migrations from './migration/sql'

(async () => {
  try {

    const appDb = path.join(config.userDirectory, 'app.db')
    const connection = await createConnection({
      database: appDb,
      type: 'sqlite',
      entities: [
          SavedConnection,
          UsedConnection,
          UsedQuery,
          FavoriteQuery
      ],
      subscriptions: [
        EncryptedColumnSubscriber
      ],
      logging: true,
      logger: 'advanced-console',
    })

    // TypeORM has built-in migrations, but instead of using sensible regular js module resolution
    // it wants to dynamically load them from files and force you to use the cli.
    // so instead we just have a big file with SQL in it.
    for(let i = 0; i < migrations.length; i++) {
      await connection.query(migrations[i]);
    }

    window.$ = $
    window.jQuery = $
    window.sql = SQL
    window.hint = Hint
    window.SQLHint = SQLHint
    Vue.config.devtools = process.env.NODE_ENV === 'development';

    Vue.mixin({
      data: function() {
        return {
          platform: window.navigator.platform,
          isMac: !!window.navigator.platform.match('Mac'),
          isWindows: !!window.navigator.platform.match('Win'),
          isLinux: !!window.navigator.userAgent.match("(Linux|X11)")
        }
      }
    })

    Vue.config.productionTip = false
    Vue.use(TypeOrmPlugin, {connection})
    Vue.use(VueHotkey)
    Vue.use(VTooltip)
    Vue.use(VModal)
    Vue.component('toggle', Vueable.Toggle);
    Vue.component('target', Vueable.Target);
    Vue.use(VueNoty, {
      timeout: 2300,
      progressBar: true,
      layout: 'bottomRight',
      theme: 'mint',
      closeWith: ['button', 'click'],
    })

    new Vue({
      render: h => h(App),
      store,
    }).$mount('#app')
  } catch (err) {
    console.error(err)
  }
})();


