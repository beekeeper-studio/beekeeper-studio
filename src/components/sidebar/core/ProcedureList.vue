<template>
    <div class="table-list functions flex-col" ref="functionswrapper">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <!-- <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span> -->
            <div>Procedures <span class="badge">{{procedures.length}}</span></div>
          </div>
        </div>
        <div class="list-body">
          <div class="list-item">
            <a class="list-item-btn" role="button" >
              <span class="btn-fab open-close" >
                <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
              </span>
              <span class="item-wrapper flex flex-middle expand">
                <i :title="title" :class="iconClass" class="item-icon function-icon material-icons">functions</i>
                <span class="table-name truncate">Function Name</span>
              </span>
              <span class="actions" >
                <span class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
                <span class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
                <!-- <span class="btn-fab pinned"><i class="bk-pin" :title="'Unpin'"></i></span> -->
              </span>
            </a>
            <!-- <div  class="sub-items">
              <span class="sub-item">
                <span class="title truncate" ref="title" @click="selectColumn(i)">Sub Name</span>
                <span class="badge" v-bind:class="c.dataType"><span>Type</span></span>
              </span>
            </div> -->

          </div>
        </div>
      </nav>
    </div>
</template>