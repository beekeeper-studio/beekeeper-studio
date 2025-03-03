<template>
  <div class="license-information card card-flat padding">
    <h3 class="card-title flex flex-middle">
      <span class="expand">{{ license.email }}</span>
      <a @click.prevent="destroy" class="btn btn-danger btn-icon"><i class="material-icons">delete_outline</i><span>Remove from app</span></a></h3>
    <div class="card-body">
      <table class="simple-table">
        <tr>
          <td>Status</td>
          <td>{{ status }}</td>
        </tr>
        <tr>
          <td>Software Updates Until</td>
          <td>{{ license.supportUntil.toLocaleDateString() }}</td>
        </tr>
        <tr>
          <td>Valid for app version</td>
          <td v-if="expiredLifetime">{{ license.maxAllowedAppRelease.tagName }} or lower</td>
          <td v-else-if="activeLicense">Any version</td>
          <td v-else>No access, new license required</td>
        </tr>
      </table>
    </div>
  </div>
</template>
<style scoped>
table.simple-table {
  width: 100%;
  border-collapse: collapse;
}

table.simple-table th,
table.simple-table td {
  padding: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

table.simple-table tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.025);
  /* Light darkening for odd rows */
}

table.simple-table td:nth-child(2) {
  text-align: right;
}

table.simple-table th {
  text-align: left;
}
</style>
<script lang="js">
export default {
  props: ['license', 'licenseStatus'],
  computed: {
    activeLicense() {
      return !this.licenseStatus.isValidDateExpired
    },
    expiredLifetime() {
      return this.licenseStatus.isSupportDateExpired && !this.licenseStatus.isValidDateExpired
    },
    status() {
      if (this.expiredLifetime) return "Expired, with lifetime access"
      if (this.activeLicense) return "Active License"
      return "Expired, no lifetime access"
    }
  },
  methods: {
    async destroy() {
      await this.$store.dispatch('licenses/remove', this.license)
    }
  }

}
</script>
