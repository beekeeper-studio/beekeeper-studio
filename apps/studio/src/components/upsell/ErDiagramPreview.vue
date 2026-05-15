<template>
  <div class="erd-preview" aria-hidden="true">
    <div class="erd-preview-stage">
      <svg class="fk-layer" viewBox="0 0 820 320" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker
            id="erUpsellArrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L8,5 L0,9 z" />
          </marker>
        </defs>

        <!-- film_actor.actor_id -> actor.actor_id -->
        <path
          d="M 220,175 L 215,175 L 215,50 L 210,50"
          pathLength="240"
          style="animation-delay: 0s"
          marker-end="url(#erUpsellArrow)"
        />
        <!-- film_actor.film_id -> film.film_id -->
        <path
          d="M 300,140 L 300,131 L 320,131 L 320,45 L 330,45"
          pathLength="240"
          style="animation-delay: 0.6s"
          marker-end="url(#erUpsellArrow)"
        />
        <!-- film.language_id -> language.language_id -->
        <path
          d="M 490,89 L 562,89 L 562,50 L 635,50"
          pathLength="240"
          style="animation-delay: 0.4s"
          marker-end="url(#erUpsellArrow)"
        />
        <!-- inventory.film_id -> film.film_id -->
        <path
          d="M 500,187 L 495,187 L 495,45 L 490,45"
          pathLength="240"
          style="animation-delay: 1.0s"
          marker-end="url(#erUpsellArrow)"
        />
        <!-- rental.inventory_id -> inventory.inventory_id -->
        <path
          d="M 540,222 L 540,198"
          pathLength="240"
          style="animation-delay: 1.4s"
          marker-end="url(#erUpsellArrow)"
        />
        <!-- rental.customer_id -> customer.customer_id -->
        <path
          d="M 380,301 L 290,301 L 290,270 L 210,270"
          pathLength="240"
          style="animation-delay: 1.6s"
          marker-end="url(#erUpsellArrow)"
        />

        <circle class="dot" cx="220" cy="175" r="2" style="animation-delay: 0s" />
        <circle class="dot" cx="300" cy="140" r="2" style="animation-delay: 0.6s" />
        <circle class="dot" cx="490" cy="89" r="2" style="animation-delay: 0.4s" />
        <circle class="dot" cx="500" cy="187" r="2" style="animation-delay: 1.0s" />
        <circle class="dot" cx="540" cy="222" r="2" style="animation-delay: 1.4s" />
        <circle class="dot" cx="380" cy="301" r="2" style="animation-delay: 1.6s" />
      </svg>

      <div class="er-table" style="left: 30px; top: 15px; width: 180px; animation-delay: 0s;">
        <div class="er-th"><i class="material-icons">grid_on</i>actor<span class="count">4</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">actor_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">first_name</span><span class="type">text</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">last_name</span><span class="type">text</span></div>
      </div>

      <div class="er-table spotlight" style="left: 330px; top: 10px; width: 160px; animation-delay: 0.2s;">
        <div class="er-th"><i class="material-icons">grid_on</i>film<span class="count">13</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">film_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">title</span><span class="type">text</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">language_id</span><span class="type">int2</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">rental_rate</span><span class="type">num</span></div>
      </div>

      <div class="er-table" style="left: 635px; top: 15px; width: 155px; animation-delay: 0.4s;">
        <div class="er-th"><i class="material-icons">grid_on</i>language<span class="count">2</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">language_id</span><span class="type">int2</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">name</span><span class="type">text</span></div>
      </div>

      <div class="er-table" style="left: 220px; top: 140px; width: 160px; animation-delay: 0.7s;">
        <div class="er-th"><i class="material-icons">grid_on</i>film_actor<span class="count">3</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">actor_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">film_id</span><span class="type">int4</span></div>
      </div>

      <div class="er-table" style="left: 500px; top: 130px; width: 160px; animation-delay: 0.9s;">
        <div class="er-th"><i class="material-icons">grid_on</i>inventory<span class="count">4</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">inventory_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">film_id</span><span class="type">int4</span></div>
      </div>

      <div class="er-table" style="left: 30px; top: 235px; width: 180px; animation-delay: 1.2s;">
        <div class="er-th"><i class="material-icons">grid_on</i>customer<span class="count">6</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">customer_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key"></span><span class="colname">email</span><span class="type">text</span></div>
      </div>

      <div class="er-table" style="left: 380px; top: 222px; width: 160px; animation-delay: 1.5s;">
        <div class="er-th"><i class="material-icons">grid_on</i>rental<span class="count">7</span></div>
        <div class="er-col"><span class="key pk">PK</span><span class="colname">rental_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">inventory_id</span><span class="type">int4</span></div>
        <div class="er-col"><span class="key fk">FK</span><span class="colname">customer_id</span><span class="type">int4</span></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({});
</script>
