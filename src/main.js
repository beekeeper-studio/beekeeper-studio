import Vue from 'vue'
import App from './App.vue'

//import '@fortawesome/fontawesome-free/css/all.css'
import './assets/styles/vendor.scss'
import './assets/styles/app.scss'
import $ from 'jquery';
import SQL from 'codemirror/mode/sql/sql'

window.$ = $
window.jQuery = $
window.sql = SQL

import 'bootstrap'
import Selectise from 'selectise'
import Split from 'split.js'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')


window.addEventListener('DOMContentLoaded', () => {

  Split(['.sidebar', '.page-content'], {
    elementStyle: (dimension, size) => ({
        'flex-basis': `calc(${size}%)`,
    }),
    sizes: [25,75],
    gutterSize: 8,
  });

  new Selectise('select', {
    shouldCloseOnClickBody: true
  })
});