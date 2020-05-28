<template>
  <div class="titlebar" @dblclick.prevent.stop="maximizeWindow" :class="{windows: $config.isWindows}">
    <div class="titlebar-icon" v-if="!$config.isMac">
      <img src="@/assets/logo.svg" />
      <x-menubar>
        <x-menuitem>
          <x-label>File</x-label>
          <x-menu>
            <x-menuitem>
              <x-label>New</x-label>
              <x-shortcut value="Control+N"></x-shortcut>
            </x-menuitem>
            <x-menuitem>
              <x-label>Open…</x-label>
              <x-shortcut value="Control+O"></x-shortcut>
            </x-menuitem>
            <hr>
            <x-menuitem>
              <x-label>Save</x-label>
              <x-shortcut value="Control+S"></x-shortcut>
            </x-menuitem>
            <x-menuitem>
              <x-label>Save as…</x-label>
              <x-shortcut value="Control+Shift+S"></x-shortcut>
            </x-menuitem>
          </x-menu>
        </x-menuitem>

        <x-menuitem>
          <x-label>Edit</x-label>
          <x-menu>
            <x-menuitem>
              <x-icon name="undo"></x-icon>
              <x-label>Undo</x-label>
              <x-shortcut value="Control+Z"></x-shortcut>
            </x-menuitem>
            <x-menuitem disabled>
              <x-icon name="redo"></x-icon>
              <x-label>Redo</x-label>
              <x-shortcut value="Control+Shift+Z"></x-shortcut>
            </x-menuitem>
            <hr>
            <x-menuitem>
              <x-icon name="content-cut"></x-icon>
              <x-label>Cut</x-label>
              <x-shortcut value="Control+X"></x-shortcut>
            </x-menuitem>
            <x-menuitem>
              <x-icon name="content-copy"></x-icon>
              <x-label>Copy</x-label>
              <x-shortcut value="Control+C"></x-shortcut>
            </x-menuitem>
            <x-menuitem>
              <x-icon name="content-paste"></x-icon>
              <x-label>Paste</x-label>
              <x-shortcut value="Control+V"></x-shortcut>
            </x-menuitem>
          </x-menu>
        </x-menuitem>

        <x-menuitem>
          <x-label>View</x-label>
          <x-menu>
            <x-menuitem togglable toggled>
              <x-label>Show ruler</x-label>
            </x-menuitem>
            <x-menuitem togglable>
              <x-label>Show spelling suggestions</x-label>
            </x-menuitem>
          </x-menu>
        </x-menuitem>

        <x-menuitem>
          <x-label>Help</x-label>
          <x-menu>
            <x-menuitem>
              <x-icon name="help"></x-icon>
              <x-label>Documentation</x-label>
            </x-menuitem>
          </x-menu>
        </x-menuitem>
      </x-menubar>

    </div>
    <div class="titlebar-title noselect">Beekeeper Studio</div>
    <div class="titlebar-actions" v-if="$config.isWindows">
      <template>
        <button class="btn btn-link" id="minimize" @click.prevent="minimizeWindow"><i class="material-icons">remove</i></button>
        <button class="btn btn-link" id="maximize" @click.prevent="maximizeWindow">
          <i class="material-icons" v-if="maximized">filter_none</i>
          <i class="material-icons" v-else>crop_square</i>
        </button>
        <button class="btn btn-link" id="quit" @click.prevent="closeWindow"><i class="material-icons">clear</i></button>
      </template>
    </div>
  </div>
</template>

<script>
import {remote} from 'electron'
export default {
    data() {
      return {
        window: remote.getCurrentWindow(),
        maximized: remote.getCurrentWindow().isMaximized()
      }
    },
    mounted() {
      this.window.on('maximize', () => {
        this.maximized = true
      })

      this.window.on('unmaximize', () => {
        this.maximized = false
      })
    },
    methods: {
      minimizeWindow() {
        this.window.minimize();
      },
      maximizeWindow() {
        if (this.window.isMaximized()) {
          this.window.unmaximize();
        } else {
          this.window.maximize();
        }
      },
      closeWindow() {
        window.close()
      }
    }
  }
</script>

<style>
  #windows-title {
    user-select: none;
  }
</style>
