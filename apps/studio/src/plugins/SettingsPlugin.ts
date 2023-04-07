import { UserSetting } from "@/common/appdb/models/user_setting"



const SettingsPlugin = {

  async get(key: string, defaultValue: any) {
    const result = await UserSetting.findOne({key})
    if (result) {
      return result.value
    }
    return defaultValue || null
  },

  async set(key: string, value: string) {
    const existing = await UserSetting.findOne({key})
    if (existing) {
      existing.userValue = value
      await existing.save()
    } else {
      const nu = new UserSetting()
      nu.key = key
      nu.defaultValue = ''
      nu.valueType = 0
      nu.userValue = value
      await nu.save()
    }
  }


}


export default {
  install(Vue) {
    Vue.prototype.$settings = SettingsPlugin
    Vue.prototype.$settings = SettingsPlugin
  }
}
