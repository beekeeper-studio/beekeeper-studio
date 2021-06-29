import Vue from 'vue'
import _ from 'lodash'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import Build from '@/views/Build.vue'
import TemplateVue from '@/views/Template.vue'
import Format from '@/views/Format.vue'
Vue.use(VueRouter)

const DEFAULT_TITLE = "SQLTools"
const DEFAULT_DESCRIPTION = ""

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: "SQLTools - Utilities for Relational Databases",
      description: "Free, open source database utilities: SQL table builder, SQL formatter, CREATE TABLE templates. Postgres, MySQL, Sqlite, SQL Server, and Redshift"
    }
  },
  {
    path: '/build',
    name: 'BuildRoot',
    component: Build,
    meta: {
      title: "SQL Table Builder",
      description: "Generate 'CREATE TABLE' statements using our builder interface. Perfect if you can never remember CREATE TABLE syntax. Works for Postgres, MySQL, Sqlite, SQL Server, and Redshift"
    }
  },
  {
    path: '/build/:id',
    name: "Build",
    component: Build,
    meta: {
      title: (to) => `${_.capitalize(to.params.id)} SQL Table Builder`,
      description: (to) => `Create a ${to.params.id} table using our visual table builder for Postgres, MySQL, Sqlite, SQL Server, or Redshift.`
    }
    
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
    meta: {
      title: "SQL Table Templates and Examples",
      description: "Use these SQL table templates to bootstrap your database. Available for Postgres, MySQL, Sqlite, SQL Server, and Redshift."
    },
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "templates" */ '../views/Templates.vue')
  },
  {
    path: '/templates/:id',
    name: 'Template',
    meta: {
      to: (to) => `${_.capitalize(to.params.id)} SQL Table Template`,
      description: (to) => `CREATE TABLE syntax for a ${to.params.id} table. Available for Postgres, MySQL, Sqlite, SQL Server, or Redshift.`
    },
    component: TemplateVue
  }
]


const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

const c = (item, to) => {
  return _.isFunction(item) ? item(to) : item
}

router.beforeEach((to, _from, next) => {
  document.title = c(to.meta.title, to) || DEFAULT_TITLE
  const desc = document.querySelector('meta[name="description"]')
  if (desc) {
    desc.setAttribute("content", c(to.meta.description, to) || DEFAULT_DESCRIPTION);
  }
  
  next()
})


export default router
