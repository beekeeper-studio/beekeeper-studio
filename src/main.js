import Vue from 'vue'
import VueNoty from 'vuejs-noty'
import App from './App.vue'
import path from 'path'
//import '@fortawesome/fontawesome-free/css/all.css'
import './assets/styles/vendor.scss'
import './assets/styles/app.scss'
import $ from 'jquery';
import SQL from 'codemirror/mode/sql/sql'
import store from './store/index'
import 'reflect-metadata'
import {createConnection} from "typeorm";
import {PostSchema} from './entity/post_schema.js'
import {User} from './entity/user'
import {TypeOrmPlugin} from './lib/typeorm_plugin'

(async () => {
  try {
    const connection = await createConnection({
      database: 'test.db',
      type: 'sqlite',
      entities: [
          PostSchema,
          User
      ],
      logging: true,
      synchronize: true,
      migrations: [path.join(__dirname, "migration/*.js")],
      migrationsRun: true
    })
    console.log("Connection Created")
    // setting true will drop tables and recreate
    console.log("Synchronized")

    window.$ = $
    window.jQuery = $
    window.sql = SQL
    Vue.config.devtools = process.env.NODE_ENV === 'development';
    let user = new User()
    user.firstName = "foo"
    user.lastName = "bar"
    await user.save()

    Vue.config.productionTip = false
    Vue.use(TypeOrmPlugin, {connection})
    Vue.use(VueNoty, {
      timeout: 3000,
      progressBar: true,
      layout: 'bottomRight',
      theme: 'mint',
      closeWith: ['button', 'click']
    })

    new Vue({
      render: h => h(App),
      store,
    }).$mount('#app')
  } catch (err) {
    console.error(err)
  }
})();


