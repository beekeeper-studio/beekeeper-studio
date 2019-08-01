import Vue from 'vue'
import App from './App.vue'

import '@fortawesome/fontawesome-free/css/all.css'
import './assets/styles/vendor.scss'
import './assets/styles/app.scss'
import $ from 'jquery';
import SQL from 'codemirror/mode/sql/sql'

window.$ = $;
window.jQuery = $;

import 'bootstrap'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
