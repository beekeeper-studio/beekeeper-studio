import { WebPluginLoader } from "@/services/plugin/web";

// i should be able to use this class like:
console.log(await window.fakePlugin.getSchemas())

class DevWebPluginLoader extends WebPluginLoader {
}
