<template>
  <!-- Sidebar -->
  <div class="sidebar flex-column" id="sidebar">
    
    <div class="data-select-wrap">
      <div class="status">
        <label>Database</label>
        <small class="text-success"><i class="fa fa-circle"></i> Connected</small>
      </div>
      <select class="database-select">
        <option selected>Public</option>
        <option value="1">One</option>
        <option value="2">Two</option>
        <option value="3">Three</option>
      </select>
    </div>
   
    <div class="search-wrap">
      <i class="material-icons">search</i>
      <input type="text" placeholder="Search">
    </div>

    <div class="sidebar-heading">Tables</div>

    <nav class="flex-column">
      <a href="#dashboard-details">
        <i class="item-icon material-icons">grid_on</i>
        <span>Dashboard</span>
      </a>
      <div class="sub-items" id="dashboard-details">
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
      <a href="#shortcuts-details">
        <i class="item-icon material-icons">grid_on</i>
        <span>Shortcuts</span>
      </a>
      <div class="sub-items" id="shortcuts-details">
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

  </div>
</template>
