<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showArgs }">
      <span class="item-wrapper flex flex-middle expand">
        <i :title="title" :class="iconClass" class="item-icon material-icons">grid_on</i>
        <span class="table-name truncate">{{routine.name}}</span>
      </span>
      <span class="actions" v-bind:class="{'pinned': pinned.includes(routine)}">
        <span v-if="!pinned.includes(routine)" @mousedown.prevent.stop="pin" class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
        <span v-if="pinned.includes(routine)" @mousedown.prevent.stop="unpin" class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
        <span v-if="pinned.includes(routine)" class="btn-fab pinned"><i class="bk-pin" :title="'Unpin'"></i></span>
      </span>
      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="copyRoutine">
            <x-label>Copy routine name</x-label>
          </x-menuitem>
          <hr>
        </x-menu>
      </x-contextmenu>
    </a>
  </div>
</template>

<style lang="scss">
  .sub-item {
    .title {
      user-select: text;
      cursor: pointer;
    }
  }
</style>

<script type="text/javascript">

  import { mapGetters } from 'vuex'
	export default {
		props: ["connection", "routine", "noSelect", "forceExpand", "forceCollapse"],
    mounted() {
    },
    data() {
      return {
        showArgs: false,
        selected: false
      }
    },
    watch: {
      forceExpand() {
        if (this.forceExpand) {
          this.showArgs = true
        }
      },
      forceCollapse() {
        if (this.forceCollapse) {
          this.showArgs = false
        }
      },
      showArgs() {
        this.routine.showArgs = this.showArgs
      },
      selected() {
        if (this.selected && !this.noSelect) {
          this.$el.scrollIntoView()
        }
      }
    },
    computed: {
      iconClass() {
        return {
          'routine-icon': true
        }
      },
      title() {
        return 'Routine or Function'
      },
      ...mapGetters(['pinned']),
    },
    methods: {
      pin() {
        this.$store.dispatch('pinRoutine', this.routine)
      },
      unpin() {
        this.$store.dispatch('unpinRoutine', this.routine)
      }
    }
	}
</script>
