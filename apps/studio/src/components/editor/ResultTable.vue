<template>
  <div class="result-table">
    <bks-table
      v-on="$listeners"
      :tableId="tableId"
      :table="tableName"
      :schema="result.schema"
      :data="tableData"
      :columns="columns"
      :hasFocus="focus"
      :preventRedraw="preventRedraw"
      :redrawState="redrawState"
      :reinitializeState="reinitializeState"
      :height="actualTableHeight"
      :dialect="dialect"
    />
  </div>
</template>

<script lang="ts">
  import _ from 'lodash'
  import Converter from '../../mixins/data_converter'
  import { dialectFor } from '@shared/lib/dialects/models'
  import { FkLinkMixin } from '@/mixins/fk_click'
  import MagicColumnBuilder from '@/lib/magic/MagicColumnBuilder'
  import { mapState } from 'vuex'
  import { Column, Table as BksTable } from "@bks/ui-kit/components/Table";
  import { PropType } from "vue";
  import { NgQueryResult } from "@/lib/db/models";
  import ISavedQuery from '@/common/interfaces/ISavedQuery'
  import { FieldDescriptor } from "@/lib/db/models";

  export default {
    components: { BksTable },
    mixins: [Converter, FkLinkMixin],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
        preventRedraw: false,
        redrawState: 0,
        reinitializeState: 0,
      }
    },
    props: {
      tableName: String,
      result: Object as PropType<NgQueryResult>,
      tableHeight: Number,
      query: Object as PropType<ISavedQuery>,
      active: Boolean,
      focus: Boolean,
    },
    watch: {
      active() {
        if (this.active) {
          this.preventRedraw = false
          this.$nextTick(() => {
            this.redrawState++
          })
        } else {
          this.preventRedraw = true
        }
      },
      result() {
        // This is better than just setting data because
        // the whole dataset has changed.
        this.reinitializeState++
      },
    },
    computed: {
      ...mapState(['usedConfig', 'connectionType']),
      tableData() {
        return this.dataToTableData(this.result, this.result.fields)
      },
      dialect() {
        return dialectFor(this.connectionType);
      },
      columns() {
        return this.result.fields.flatMap((column: FieldDescriptor) => {
          const col: Column = {
            field: column.id,
            title: column.name,
            dataType: column.dataType,
          }

          const magic = MagicColumnBuilder.build(column.name)

          if (magic) {
            if (magic.formatterParams?.fk) {
              magic.formatterParams.fkOnClick = (_e, cell) => this.fkClick(magic.formatterParams.fk[0], cell)
            }

            const magicStuff = _.pick(magic, ['formatter', 'formatterParams'])
            const result = {
              ...col,
              title: magic.title,
              cssClass: magic.cssClass,
              tabulatorColumnDefinition: magicStuff,
            } as Column

            if (magic && magic.tableLink) {
              const fkCol = this.fkColumn(result, [magic.tableLink])
              return [result, fkCol]
            }

            return result
          }

          return col
        })
      },
      tableId() {
        // the id for a tabulator table
        if (!this.usedConfig.id) return null;

        const workspace = 'workspace-' + this.worskpaceId
        const connection = 'connection-' + this.usedConfig.id
        const table = 'table-' + this.tableName
        const columns = 'columns-' + this.result.fields.reduce((str, field) => `${str},${field.name}`, '')
        return `${workspace}.${connection}.${table}.${columns}`
      },
    },
	}
</script>
