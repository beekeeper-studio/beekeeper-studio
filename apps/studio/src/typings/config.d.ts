import config from '@/config';
import Vue from 'vue'

declare module 'vue/types/vue' {
  interface Vue {
    $config: typeof config
  }
}
