<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showArgs }">
      <span class="btn-fab open-close" @mousedown.prevent="toggleArgs" >
        <i v-if="displayParams.length > 0" class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>      
      <span class="item-wrapper flex flex-middle expand">
        <i :title="title" :class="iconClass" class="item-icon material-icons">functions</i>
        <span class="table-name truncate" :title="routine.name">{{routine.name}}</span>
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
          <x-menuitem @click.prevent="toggleArgs">
            <x-label>Toggle arguments</x-label>
          </x-menuitem>
          <hr>
        </x-menu>
      </x-contextmenu>
    </a>
    <div v-if="showArgs" class="sub-items">
      <!-- <span class="sub-item" v-if="displayParams.length === 0">
        <span class="title truncate">No Parameters</span>
      </span>       -->
      <span :key="param.name" v-for="(param) in displayParams" class="sub-item">
        <span class="title truncate" ref="title">{{param.name}}</span>
        <span class="badge" :class="param.type">{{param.type}}<span v-if="param.length">({{param.length}})</span></span>
      </span>
    </div>
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
import { RoutineTypeNames } from '@/lib/db/models'

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
      displayParams() {
        const result = [...this.routine.routineParams]
        if (this.routine.returnType) {
          result.push({ name: 'RETURN', type: this.routine.returnType, length: this.routine.returnTypeLength })
        }
      return result
      },
      iconClass() {
        const result = { 'routine-icon': true }
        result[`routine-${this.routine.type}-icon`] = true
        return result
      },
      title() {
        return RoutineTypeNames[this.routine.type]
      },
      ...mapGetters(['pinned']),
    },
    methods: {
      toggleArgs() {
        this.showArgs = !this.showArgs
      },
      pin() {
        this.$store.dispatch('pinRoutine', this.routine)
      },
      unpin() {
        this.$store.dispatch('unpinRoutine', this.routine)
      },
      createRoutine() {
        this.$root.$emit('loadRoutineCreate', this.routine)
      }
    }
	}
</script>
