<template>
    <x-buttons class="pending-changes">
        <x-button class="btn btn-primary" @click.prevent="submitApply">
            <span>{{ labelApply || 'Apply' }}</span>
        </x-button>
        <x-button class="btn btn-primary" menu>
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
                <x-menuitem @click.prevent="submitApply">
                    <x-label>
                        {{ labelApply || 'Apply' }}
                    </x-label>
                    <x-shortcut value="Control+S"></x-shortcut>
                </x-menuitem>
                <x-menuitem @click.prevent="submitSql">
                    <x-label>
                        {{ labelSql || 'Copy to SQL' }}
                    </x-label>
                    <x-shortcut value="Control+Shift+S"></x-shortcut>
                </x-menuitem>
            </x-menu>
        </x-button>
    </x-buttons>
</template>

<script>
export default {
    name: 'PendingChanges',
    props: {
        submitApply: Function,
        submitSql: Function,
        labelApply: String,
        labelSql: String,
    },
    hotkeys() {
        const result = {}
        result[this.ctrlOrCmd('s')] = this.submitApply.bind(this)
        result[this.ctrlOrCmd('shift+s')] = this.submitSql.bind(this)
        return result
    },
}
</script>

<style module>
x-buttons.pending-changes .btn {
    margin: 0;
}
</style>