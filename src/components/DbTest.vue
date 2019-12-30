<template>
  <div class="example">
    <ul class="posts">
      <li v-for="(post, idx) in posts" :id="idx">
        <input type="text" v-model="post.title">
        <button @click.prevent="submit(post)">Update</button>
        {{post.id}}-{{post.title}}: {{post.text}}
      </li>
    </ul>
  </div>
</template>

<script type="text/javascript">
  
  import {Post} from '../model/post'

  export default {
    data() {
      return {
        posts: [],
        repo: null
      }
    },
    async mounted() {
      this.repo = this.$connection.getRepository(Post)
      this.posts = await this.repo.find()
    },
    methods: {
      async submit(post) {
        await this.repo.save(post)
        this.$noty.success("Saved")
      }
    }
  }

</script>