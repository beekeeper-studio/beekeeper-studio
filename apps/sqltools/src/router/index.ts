import Vue from 'vue'
import _ from 'lodash'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import TemplatesVue from '@/views/Templates.vue'
import DialectsVue from '@/views/Dialects.vue'
import DialectVue from '@/views/dialect/Dialect.vue'
import ExampleVue from '@/views/dialect/Example.vue'
import Build from '@/views/Build.vue'
import TemplateVue from '@/views/Template.vue'
import Format from '@/views/Format.vue'
Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/build',
    name: 'BuildRoot',
    component: Build,
  },
  {
    path: '/build/:id',
    name: "Build",
    component: Build,    
  },
  {
    path: '/format',
    name: "Format",
    component: Format,
    meta: {
      title: "SQL Query Formatter",
      description: "Paste ugly SQL, get pretty SQL back."
    }
  },
  {
    path: '/templates',
    name: 'Templates',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: TemplatesVue
  },
  {
    path: '/templates/:id',
    name: 'Template',
    component: TemplateVue
  },
  {
    path: '/dialects/',
    name: 'Dialects',
    component: DialectsVue
  },
  {
    path: '/dialects/:dialect_id',
    name: "Dialect",
    component: DialectVue
  },
  {
    path: '/dialects/:dialect_id/examples/:id',
    name: "Example",
    component: ExampleVue
  },
]


const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
