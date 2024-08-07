import config from '@/config';
import Vue from 'vue'
import config from '../config'

declare module 'vue/types/vue' {
  interface Vue {
    $config: typeof config
  }
}
