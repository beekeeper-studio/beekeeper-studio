import Vue from 'vue'
import App from './App.vue'
import router from './router'

// import 'typeface-roboto'
// import 'typeface-source-code-pro'

import 'tabulator-tables/dist/css/tabulator.css'
import '@/assets/styles/app.scss'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
