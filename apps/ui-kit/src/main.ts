import Vue from 'vue'
import './style.css'
import App from './App.vue'

const app = new Vue({
  render: h => h(App)
})

app.$mount('#app')
