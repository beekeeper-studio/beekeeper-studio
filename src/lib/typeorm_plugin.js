export const TypeOrmPlugin = {
  install(vue, options) {
    vue.prototype.$connection = options.connection
  }
}
