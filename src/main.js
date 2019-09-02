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

import 'bootstrap'
// import Selectise from 'selectise'
import Split from 'split.js'

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


window.addEventListener('DOMContentLoaded', () => {

  Split(['.sidebar', '.page-content'], {
    elementStyle: (dimension, size) => ({
        'flex-basis': `calc(${size}%)`,
    }),
    sizes: [25,75],
    gutterSize: 8,
  });

  // new Selectise('select', {
  //   shouldCloseOnClickBody: true
  // })
});
