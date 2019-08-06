<template>
  <div>
    <div class="container">
      <div class="row justify-content-sm-center">
        <div class="col-md-6">
          <div class="card mt-5">
            <div class="card-body">
              <h5 class="card-title">Enter Connection Information</h5>
              <form @action="submit">
                <div class="form-group">
                  <label for="connectionType">Connection Type</label>
                  <select name="connectionType" class="form-control custom-select" v-model="connectionType" id="connection-select">
                    <option value="mysql">MySQL</option>
                    <option value="psql">Postgres</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="Host">Host</label>
                  <input type="text" class="form-control" name="host" v-model="host">
                </div>

                <div class="text-right">
                  <button class="btn btn-primary mr-2" @click="saveConnection">Save</button>
                  <button class="btn btn-success mr-2" @click="testConnection">Test</button>
                  <button class="btn btn-info" @click="submit">Connect</button>
                </div>
              </form>
            </div>

          </div>

        </div>
      </div>
      <div class="row justify-content-sm-center mt-5">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Choose a saved connection</h5>
            </div>
            <div class="list-group">
              <a href="#" class="list-group-item-link list-group-item">
                Foo
                <span class="float-right"><a href="" class="">CONNECT</a></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script>
  export default {
    data() {
      return {
        host: 'localhost',
        connectionType: 'mysql'
      }
    }
  }
</script>
