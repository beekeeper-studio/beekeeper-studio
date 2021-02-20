<template>
    <div>
        <label for="createTable" class="checkbox-group">
            <input v-model="options.createTable" id="createTable" type="checkbox" name="createTable" class="form-control">
            <span>Include <code>CREATE TABLE</code> query</span>
        </label>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            required: true
        }
    },
    data() {
        return {
            options: {
                createTable: false,
            }
        }
    },
    watch: {
        options(newVal) {
            this.$emit('input', newVal)
        }
    },
    mounted() {
        this.$emit('input', this.options)
    }
}
</script>