import Vue from 'vue'
import VueNoty from 'vuejs-noty'
import App from './App.vue'

//import '@fortawesome/fontawesome-free/css/all.css'
import './assets/styles/vendor.scss'
import './assets/styles/app.scss'
import $ from 'jquery';
import SQL from 'codemirror/mode/sql/sql'
import store from './store/index'

window.$ = $
window.jQuery = $
window.sql = SQL
Vue.config.devtools = process.env.NODE_ENV === 'development';

//import 'bootstrap'

Vue.config.productionTip = false
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
