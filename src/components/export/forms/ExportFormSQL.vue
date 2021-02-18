<template>
    <div>
        <label for="createTable" class="checkbox-group">
            <input id="createTable" type="checkbox" name="createTable" class="form-control" :disabled="busy">
            <span>Include <code>CREATE TABLE</code> query</span>
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