<template>
  <!-- Sidebar -->
  <div class="sidebar flex-column" id="sidebar">
    
    <div class="data-select-wrap">
      <select class="database-select">
        <option selected>Public</option>
        <option value="1">One</option>
        <option value="2">Two</option>
        <option value="3">Three</option>
      </select>
    </div>
   
    <div class="search-wrap">
      <input type="text" placeholder="Filter">
    </div>

    <div class="sidebar-heading">Tables</div>

    <nav class="flex-column">
      <a href="#dashboard-details" data-toggle="collapse" role="button">
        <i class="item-icon material-icons">grid_on</i>
        <span>Dashboard</span>
      </a>
      <div class="sub-items collapse" id="dashboard-details">
        <span class="sub-item">
          <span class="title">first_name</span>
          <span class="badge badge-info">varchar(255)</span>
        </span>
        <span class="sub-item">
          <span class="title">last_name</span>
          <span class="badge badge-info">varchar(255)</span>
        </span>
        <span class="sub-item">
          <span class="title">age</span>
          <span class="badge badge-info">int(8)</span>
        </span>
      </div>
      <a href="#shortcuts-details" data-toggle="collapse" role="button">
        <i class="item-icon material-icons">grid_on</i>
        <span>Shortcuts</span>
      </a>
      <div class="sub-items collapse" id="shortcuts-details">
        <span class="sub-item">
          <span class="title">first_name</span>
          <span class="badge badge-info">varchar(255)</span>
        </span>
        <span class="sub-item">
          <span class="title">last_name</span>
          <span class="badge badge-info">varchar(255)</span>
        </span>
        <span class="sub-item">
          <span class="title">age</span>
          <span class="badge badge-info">int(8)</span>
        </span>
      </div>        
      <a href="#" class="">
        <i class="item-icon material-icons">grid_on</i>
        <span>Overview</span>
      </a>
      <a href="#" class="">
        <i class="item-icon material-icons">grid_on</i>
        <span>Events</span>
      </a>
      <a href="#" class="">
        <i class="item-icon material-icons">grid_on</i>
        <span>Profile</span>
      </a>
      <a href="#" class="">
        <i class="item-icon material-icons">grid_on</i>
        <span>Status</span>
      </a>
    </nav>
    <span class="expand"></span>
    <div class="status">
      <small class="text-success"><i class="material-icons">brightness_1</i> Connected</small>
    </div>
  </div>
</template>
