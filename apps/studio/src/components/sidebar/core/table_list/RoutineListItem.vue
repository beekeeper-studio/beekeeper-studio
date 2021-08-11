<template>
  <div class="list-item" @contextmenu="$emit('contextmenu', $event)">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showArgs }">
      <span class="btn-fab open-close" @mousedown.prevent="toggleArgs" @contextmenu.stop.prevent="" >
        <i v-if="displayParams.length > 0" class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>      
      <span class="item-wrapper flex flex-middle expand">
        <i :title="title" :class="iconClass" class="item-icon material-icons">functions</i>
        <span class="table-name truncate" :title="routine.name">{{routine.name}}</span>
      </span>
      <span class="actions" v-bind:class="{'pinned': pinned}">
        <span v-if="!pinned" @mousedown.prevent.stop="pin" class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
        <span v-if="pinned" @mousedown.prevent.stop="unpin" class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
        <span v-if="pinned" class="btn-fab pinned"><i class="bk-pin" :title="'Unpin'"></i></span>
      </span>
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
		props: ["connection", "routine", "noSelect", "forceExpand", "forceCollapse", "pinned"],
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
    },
    methods: {
      toggleArgs() {
        this.showArgs = !this.showArgs
      },
      pin() {
        this.$store.dispatch('pins/add', this.routine)
      },
      unpin() {
        this.$store.dispatch('pins/remove', this.routine)
      },
      createRoutine() {
        this.$root.$emit('loadRoutineCreate', this.routine)
      }
    }
	}
</script>
