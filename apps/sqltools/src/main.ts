import Vue from 'vue'
import App from './App.vue'
import router from './router'
import 'typeface-roboto'
import 'typeface-source-code-pro'
import 'xel/xel'

import 'tabulator-tables/dist/css/tabulator.css'
import 'highlight.js/styles/hybrid.css';
import '@/assets/styles/app.scss'

import store from './store'

import hljs from 'highlight.js'
import VueClipboard from 'vue-clipboard2'
import VueMeta from 'vue-meta'

Vue.use(VueClipboard)
Vue.use(hljs.vuePlugin)
Vue.use(VueMeta)
Vue.config.productionTip = false
new Vue({
  router,
  render: h => h(App),
  store
}).$mount('#app')
