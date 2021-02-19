<template>
    <div>
        <label for="prettyprint" class="checkbox-group">
            <input v-model="options.prettyprint" id="prettyprint" type="checkbox" name="prettyprint" class="form-control" :disabled="busy">
            <span>Pretty-print</span>
        </label>
    </div>
</template>

<script>
export default {
    props: {
        busy: {
            default: false
        },
        value: {
            required: true
        }
    },
    data() {
        return {
            options: {
                prettyprint: true,
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