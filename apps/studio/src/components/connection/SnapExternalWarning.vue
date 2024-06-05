<template>
  <div class="alert alert-warning" v-if="$config.isSnap">
    <i class="material-icons">error_outline</i>
    <div>
      Hey snap user! If you want to use a sqlite database on an external drive
      you'll need to give Beekeeper some extra permissions
      <external-link
        href="https://docs.beekeeperstudio.io/pages/troubleshooting#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive"
      >
        Read more
      </external-link>
    </div>
  </div>
</template>
