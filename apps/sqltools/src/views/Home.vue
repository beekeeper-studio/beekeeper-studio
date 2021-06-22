<template>
  <div class="home">
    <section class="subheader">
      <div class="small-wrap">
        <!-- Alert -->
        <tutorial-alert />
        <!-- Dialect with Actions -->
        <div class="flex">
          <dialect-picker class="shrink" :confirm="schemaChanges > 0" :confirmMessage="confirmMessage"/>
          <span class="expand"></span>
          <div class="actions">
            <x-buttons class="export">
              <x-button class="btn btn-info">
                Export
              </x-button>
              <x-button class="btn btn-info" menu>
                <i class="material-icons">arrow_drop_down</i>
                <x-menu  style="--target-align: right;">
                  <x-menuitem @click.prevent="">
                    <x-label>Item 1</x-label>
                  </x-menuitem>
                  <x-menuitem @click.prevent="">
                    <x-label>Item 2</x-label>
                  </x-menuitem>
                </x-menu>
              </x-button>
            </x-buttons>
          </div>
        </div>
      </div>
    </section>
    <section>
      <div class="small-wrap">

        <!-- Schema Builder -->
        <schema-builder
          :initialSchema="schema"
          :initialName="name"
          :resetOnUpdate="true"
          @schemaChanged="schemaChanged"
        >
          <template>
            <span class="table-title">Columns</span>
          </template>
        </schema-builder>

        <div class="code-wrap" v-if="formattedSql">
          <h2>
            Generated SQL for {{dialectTitle}}
          </h2>
          <p class="dialect-warning">{{dialectWarning ? `*${dialectWarning}`: ''}}</p>
          <highlightjs :lang="highlightDialect" :code="formattedSql" />
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import { mapGetters, mapState } from 'vuex'
import { UserTemplate as users } from '../lib/templates/user'
import DialectPicker from '@/components/DialectPicker.vue'
import { DialectTitles, Schema } from '@shared/lib/dialects/models'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import Formatter from 'sql-formatter'
import Knex from 'knex'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator';
import TutorialAlert from '@/components/TutorialAlert.vue';
interface Data {
  name: string
  sql?: string,
  knex?: Knex,
  generator: SqlGenerator
  schemaChanges: number
}


const dialectNotes = {
  sqlite: "Sqlite does not support table or column comments",
}

export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder,
    DialectPicker,
    TutorialAlert
  },
  data(): Data {
    return {
      name: users.name,
      sql: undefined,
      knex: undefined,
      generator: undefined,
      schemaChanges: 0
    }
  },
  watch: {
    dialect() {
      this.generator.dialect = this.dialect
      this.schemaChanges = 0
    },

  },
  computed: {
    ...mapState(['dialect', 'dismissedTutorial']),
    ...mapGetters(['knexDialect']),
    confirmMessage() {
      return `You will lose ${this.schemaChanges} changes, continue?`
    },
    dialectWarning() {
      return dialectNotes[this.dialect]
    },
    highlightDialect() {
      switch (this.dialect) {
        case 'postgresql':
        case 'redshift':
          return 'pgsql'
        default:
          return 'sql'
      }
    },
    dialectTitle() {
      return DialectTitles[this.dialect]
    },
    schema() {
      return users.toSchema(this.dialect)
    },
    formattedSql() {
      // TODO (map dialects)
      if (!this.sql) return null
      return Formatter.format(this.sql, { language: 'sql'})
    }
  },
  methods: {
    schemaChanged(schema: Schema) {
      this.schemaChanges += 1
      this.sql = this.generator.buildSql(schema)
    },
    dismissTutorial() {
      this.$store.commit('setDismissedTutorial')
    }
  },
  mounted() {
    this.knex = Knex({'dialect': this.knexDialect})
    this.generator = new SqlGenerator(this.dialect)
    this.sql = this.generator.buildSql(this.schema)
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  section {
    padding: $gutter-w * 2;
  }
  .subheader {
    display: flex;
    flex-direction: column;
    background: $query-editor-bg;
    padding: $gutter-w * 2;
  }
  .alert {
    position: relative;
      margin-bottom: $gutter-w * 2;
    .close-btn {
      position: absolute;
      top: $gutter-h;
      right: $gutter-h;
      &:hover {
        .material-icons {
          color: $text-dark
        }
      }
      .material-icons {
        color: $text-lighter;
        transition: color 0.2s ease-in-out;
      }
    }
  }
  .table-header {
    padding: $gutter-w 0;
    .table-title {
      font-weight: bold;
      font-size: 1.25rem;
      margin: 0;
      color: $text-dark;
    }
  }

  .table-info {
    padding-bottom: $gutter-w * 2;
    .table-name {
      padding: 0 $gutter-h;
      margin: 0 -$gutter-h;
      margin-bottom: $gutter-w;
      display: flex;
      align-items: center;
      .item-icon {
        font-size: 1.6rem;
        margin-right: $gutter-w;
      }
    }
    .table-meta {
      padding: $gutter-w;
      margin: 0 -$gutter-h;
      color: $text-lighter;
    }
    .table-description {
      position: relative;
      padding: $gutter-h $gutter-w;
      margin: 0 (-$gutter-h) 0;
      border-radius: 3px;
      cursor: pointer;
      min-height: 60px;
      // &:hover {
      //   background: rgba($theme-base, 0.025);
      //   .material-icons {
      //     display: inline-block;
      //   }
      // }
      // &.edit-success {
      //   background-color: green;
      // }
      // &.edit-error {
      //   background-color: red;
      // }
      // .material-icons {
      //   display: none;
      //   position: absolute;
      //   top: $gutter-h;
      //   right: $gutter-h;
      //   opacity: 0.58;
      // }
    }
    // .table-description-wrap {
    //   h1, h2, h3, h4, h5, h5, p {
    //     margin: 0 0 $gutter-h;
    //   }
    // }
    // .table-description-edit {
    //   position: relative;
    //   margin-top: $gutter-w;
    //   padding-bottom: 3rem;
    //   textarea {
    //     min-height: 120px;
    //     padding: $gutter-h $gutter-w;
    //     resize: vertical;
    //   }
    //   span.markdown {
    //     content: 'markdown';
    //     font-size: 10px;
    //     color: $text-lighter;
    //     display: inline-block;
    //     position: absolute;
    //     top: $gutter-h;
    //     right: $gutter-h;
    //     padding: 0 $gutter-h;
    //     line-height: 1.8;
    //     // background: rgba($theme-base, 0.1);
    //     box-shadow: 0 0 0 1px $border-color;
    //     border-radius: 4px;
    //   }
    // }
    // .table-description-actions {
    //   position: absolute;
    //   right: $gutter-h * 1.25;
    //   bottom: $gutter-h * 1.25;
    //   .btn {
    //     min-width: min-content;
    //   }
    // }
  }
</style>