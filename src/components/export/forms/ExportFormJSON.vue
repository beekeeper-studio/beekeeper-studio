<template>
    <div>
        <label for="prettyprint" class="checkbox-group">
            <input id="prettyprint" type="checkbox" name="prettyprint" class="form-control" :disabled="busy">
            <span>Pretty-print</span>
        </label>
    </div>
</template>

<script>
export default {
    props: {
        busy: {
            default: false
        }
    }
}
</script>