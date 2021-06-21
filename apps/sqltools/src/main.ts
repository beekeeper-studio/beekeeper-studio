import Vue from 'vue'
import App from './App.vue'
import router from './router'
import 'typeface-roboto'
// import 'typeface-source-code-pro'
import 'tabulator-tables/dist/css/tabulator.css'
import 'highlight.js/styles/github.css';
import '@/assets/styles/app.scss'

import store from './store'

import hljs from 'highlight.js'
Vue.use(hljs.vuePlugin)
Vue.config.productionTip = false
new Vue({
  router,
  render: h => h(App),
  store
}).$mount('#app')
