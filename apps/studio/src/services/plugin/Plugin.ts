export default class Plugin {
  onLoad(): void | Promise<void> {}
  onDestroy(): void | Promise<void> {}
}
