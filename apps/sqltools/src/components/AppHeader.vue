<template>
  <header class="header row flex-middle">
    <router-link class="logo" to="/" title="SQLTools by Beekeeper Studio - Homepage">
      <img class="logo-img" src="@/assets/icons/bk-logo-yellow-icon.svg">
      <div class="flex-col">
        <span class="logo-title">SQLTools</span>
      </div>
    </router-link>
    <span class="expand"></span>
    <nav>
      <router-link :to="{path: '/format'}" class="btn btn-link">SQL Formatter</router-link>      
      <router-link :to="{path: '/build'}" class="btn btn-link">Table Builder</router-link>
      <router-link to="/templates" class="btn btn-link">Table Templates</router-link>
      <!-- <dialect-picker /> -->
    </nav>
  </header>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  // components: {
  //   DialectPicker
  // }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';
  @import '@/assets/styles/app/_flex-grid';

  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: 0 1.5em;
    transition: height 0.2s ease-in-out;
    background: lighten($theme-bg, 4%);
    height: 4em;
    box-shadow: 0 3px 1px -2px rgba(black,.2), 
                0 2px 2px 0 rgba(black,.14), 
                0 1px 5px 0 rgba(black,.12);
    a {
      color:white;
      @media (max-width: $screen-xs) {
        &.btn {
          font-size: 11px;
          min-width: 0;
        }
      }
    }
    .logo {
      display: flex;
      align-items: center;
      img {
        width: 32px;
        margin-right: 0.5rem;
        @media (max-width: $screen-xs) {
          margin-right: 0;
        }
      }
    }
    .logo-title {
      font-weight: bold;
      font-size: 22px;
      color: $text-dark;
      margin-right: 2rem;
    }
    .logo-subtitle {
      font-size: 0.7rem;
      line-height: 1.4;
      color: $text-light;
    }
    nav {
      margin-left: 1.5em;
    }
    .btn-group {
      display: flex;
      align-items: center;
      .btn-fab {
        margin: 0 0.25rem;
        &:first-child{
          margin-left: 0;
        }
        &:last-child {
          margin-right: 0;
        }
      }
      > span {
        display: inline-flex;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        .hide-xs {
          margin-left: 3px;
        }
        .material-icons {
          font-size: 15px;
          width: 15px;
          margin-right: 0.35rem;
        }
        &.btn-primary {
          color: rgba(black, 0.87);
        }
      }
      @media (max-width: $screen-sm) {
        min-width: auto;
        .btn {
          font-size: 11px;
        }
      }
    }
    @media (max-width: $screen-sm) {
      padding: 0 1em;
    }
    @media (max-width: 480px) {
      .btn-flat {
        min-width: 0;
      }
      nav {
        margin-right: 0;
      }
    }
  }

  // Mobile Menu
  // .overlay {
  //   display: none;
  //   position: fixed;
  //   left: 0;
  //   top: 0;
  //   right: 0;
  //   bottom: 0;
  //   flex-direction: column;
  //   align-items: center;
  //   justify-content: center;
  //   background: rgba($theme-bg, 0.96);
  //   overflow-x: hidden;
  //   transition: 0.15s ease-in-out;
  //   z-index: 100;
  //   nav {
  //     @extend .flex-col;
  //     margin: 0;
  //     a {
  //       font-size: 28px;
  //       padding: 8px;
  //       color: $text-dark;
  //       margin: 0.5rem;
  //       text-transform: initial;
  //       transition: color 0.2s ease-in-out;
  //       &:hover, &:focus {
  //         color: $text;
  //       }
  //     }
  //   }
  //   .close-btn {
  //     position: absolute;
  //     top: 24px;
  //     right: 24px;
  //     display: flex;
  //     font-size: 60px;
  //     color: $text-dark;
  //   }
  //   @media (max-height: 450px) {
  //     .overlay {
  //       a {
  //         font-size: 20px;
  //       }
  //       .close-btn {
  //         font-size: 40px;
  //         top: 15px;
  //         right: 35px;
  //       }
  //     }
  //   }
  // }
  // body.menu-open {
  //   overflow: hidden;
  //   .overlay {
  //     display: flex;
  //   }
  // }
</style>
