import Vue from 'vue'
import App from './Dev.vue'
import 'tabulator-tables/dist/css/tabulator.css'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
