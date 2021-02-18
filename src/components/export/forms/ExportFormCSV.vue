<template>
    <div>
        <div class="form-group">
            <div class="form-group row">
                <label>Delimiter</label>
                <input type="text" class="form-control" autofocus ref="paramInput" value=";" :disabled="busy">
            </div>
        </div>
        <div class="form-group">
            <div class="form-group row">
                <label for="createTable" class="checkbox-group">
                    <input id="createTable" type="checkbox" name="createTable" class="form-control" :disabled="busy">
                    <span>Include header row</span>
                </label>
            </div>
        </div>
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