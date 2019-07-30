import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import Panel from '@/components/Panel'
import LiveConfig from '@/components/LiveConfig'
import Config from '@/components/Config'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'HelloWorld',
      component: HelloWorld
    },
    {
      path: '/panel.html',
      name: 'Panel',
      component: Panel
    },
    {
      path: '/liveconfig.html',
      name: 'LiveConfig',
      component: LiveConfig
    },
    {
      path: '/config.html',
      name: 'Config',
      component: Config
    }
  ]
})
