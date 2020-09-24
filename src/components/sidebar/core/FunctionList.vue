<template>
    <div class="table-list functions flex-col">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div>Functions & Procedures <span class="badge">{{functions.length}}</span></div>
          </div>
        </div>
        <div class="list-body">
          <div v-if="hasSchemas" class="with-schemas">
            <SchemaContainer
              v-for="(blob, index) in schemaFunctions"
              :key="blob.schema"
              :title="blob.schema"
              :expandInitially="index === 0"
              :forceExpand="allExpanded"
              :forceCollapse="allCollapsed"
            >
              <div class="list-item">
                <a v-for="f in blob.functions" :key="f.routineName" class="list-item-btn" role="button" >
                  <span class="btn-fab open-close" @mousedown.prevent="toggleColumns" >
                    <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
                  </span>
                  <span class="item-wrapper flex flex-middle expand">
                    <i :title="f.routineType" class="item-icon function-icon material-icons">{{iconClass(f)}}</i>
                    <span class="table-name truncate">{{f.routineName}}</span>
                    <span class="badge">{{f.returnType || ''}}</span>
                  </span>
                  <span class="actions" >
                    <span class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
                    <span class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
                  </span>
                </a>
              </div>
            </SchemaContainer>
          </div>
          <div v-else>
            <div class="list-item">
              <a v-for="f in functions" :key="f.routineName" class="list-item-btn" role="button" >
                <span class="item-wrapper flex flex-middle expand">
                  <i :title="f.routineName" :class="iconClass" class="item-icon function-icon material-icons">functions</i>
                  <span class="table-name truncate">{{f.routineName}}</span>
                  <span class="badge">{{f.routineType}}</span>
                </span>
                <span class="actions" >
                  <span class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
                  <span class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import SchemaContainer from './SchemaContainer'
export default {
  components: { SchemaContainer },
  data() {
    return {
      
    }
  },
  computed: {
    ...mapState(['functions']),
    ...mapGetters(['schemaFunctions']),
    hasSchemas() {
      return this.schemaFunctions.length > 1
    }
  },
  methods: {
    iconClass(f) {
      return f.routineType === 'procedure' ? 'extension' : 'functions'
    },
    async toggleColumns() {
      this.showColumns = !this.showColumns
    }
  }
}
</script>