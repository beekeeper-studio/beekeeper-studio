import Vue from 'vue'
import App from './Dev.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
