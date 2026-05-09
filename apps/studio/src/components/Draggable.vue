<template>
  <component :is="tag" ref="root">
    <slot />
  </component>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import Sortable, { SortableEvent, SortableOptions } from 'sortablejs'

type Group = string | Sortable.GroupOptions

interface DraggableInstance extends Vue {
  list: unknown[] | null
  value: unknown[] | null
  realList: unknown[] | null
}

export default Vue.extend({
  name: 'Draggable',
  props: {
    list: { type: Array as PropType<unknown[]>, default: null },
    value: { type: Array as PropType<unknown[]>, default: null },
    tag: { type: String, default: 'div' },
    options: { type: Object as PropType<Partial<SortableOptions>>, default: () => ({}) },
    group: { type: [String, Object] as PropType<Group>, default: null },
    chosenClass: { type: String, default: null },
    ghostClass: { type: String, default: null },
    dragClass: { type: String, default: null },
  },
  data() {
    return { sortable: null as Sortable | null }
  },
  computed: {
    realList(): unknown[] | null {
      return this.list != null ? this.list : this.value
    },
  },
  mounted() {
    const root = this.$refs.root as HTMLElement
    ;(root as any).__draggable__ = this
    const opts: SortableOptions = {
      ...this.options,
      ...(this.group != null ? { group: this.group } : {}),
      ...(this.chosenClass != null ? { chosenClass: this.chosenClass } : {}),
      ...(this.ghostClass != null ? { ghostClass: this.ghostClass } : {}),
      ...(this.dragClass != null ? { dragClass: this.dragClass } : {}),
      onStart: (e) => this.$emit('start', e),
      onEnd: (e) => this.$emit('end', e),
      onAdd: (e) => this.handleAdd(e),
      onRemove: (e) => this.handleRemove(e),
      onUpdate: (e) => this.handleUpdate(e),
    }
    this.sortable = Sortable.create(root, opts)
  },
  beforeDestroy() {
    this.sortable?.destroy()
    this.sortable = null
    const root = this.$refs.root as HTMLElement | undefined
    if (root) delete (root as any).__draggable__
  },
  methods: {
    sourceInstance(e: SortableEvent): DraggableInstance | null {
      const from = e.from as HTMLElement | null
      return from ? ((from as any).__draggable__ as DraggableInstance | undefined) ?? null : null
    },
    removeFromDom(item: HTMLElement) {
      item.parentNode?.removeChild(item)
    },
    publishList(updated: unknown[]) {
      if (this.list != null) {
        this.list.splice(0, this.list.length, ...updated)
      }
      this.$emit('input', updated)
    },
    handleUpdate(e: SortableEvent) {
      this.removeFromDom(e.item)
      const list = this.realList
      if (list == null || e.oldIndex == null || e.newIndex == null) return
      const updated = list.slice()
      const [moved] = updated.splice(e.oldIndex, 1)
      updated.splice(e.newIndex, 0, moved)
      this.publishList(updated)
      this.$emit('change', {
        moved: { element: moved, newIndex: e.newIndex, oldIndex: e.oldIndex },
      })
    },
    handleAdd(e: SortableEvent) {
      this.removeFromDom(e.item)
      const source = this.sourceInstance(e)
      const sourceList = source?.realList ?? null
      const element =
        sourceList != null && e.oldIndex != null ? sourceList[e.oldIndex] : null
      const list = this.realList
      if (list != null && element != null && e.newIndex != null) {
        const updated = list.slice()
        updated.splice(e.newIndex, 0, element)
        this.publishList(updated)
      }
      this.$emit('change', { added: { element, newIndex: e.newIndex } })
    },
    handleRemove(e: SortableEvent) {
      const list = this.realList
      if (list == null || e.oldIndex == null) {
        this.$emit('change', { removed: { element: null, oldIndex: e.oldIndex } })
        return
      }
      const updated = list.slice()
      const [removed] = updated.splice(e.oldIndex, 1)
      this.publishList(updated)
      this.$emit('change', {
        removed: { element: removed, oldIndex: e.oldIndex },
      })
    },
  },
})
</script>
