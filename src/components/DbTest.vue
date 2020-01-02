<template>
  <div class="example">
    <ul class="posts">
      <li v-for="(user, idx) in users" :key="idx">
        <input type="text" v-model="user.firstName">
        <button @click.prevent="submit(user)">Update</button>
        {{user.id}}-{{user.firstName}}: {{user.lastName}}: {{user}}
      </li>
    </ul>
  </div>
</template>

<script type="text/javascript">
  
  // import {Post} from '../model/post'
  import {User} from '../entity/user'

  export default {
    data() {
      return {
        posts: [],
        repo: null,
        users: []
      }
    },
    async mounted() {
      // this.repo = this.$connection.getRepository(Post)
      // this.posts = await this.repo.find()
      this.users = await User.find()
    },
    methods: {
      async submit(user) {
        await user.save()
      }
    }
  }

</script>