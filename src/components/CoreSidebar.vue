<template>
    <!-- Sidebar -->
    <div class="bg-light border-right" id="sidebar-wrapper">
      <select class="custom-select custom-select-sm database-select">
        <option selected>Public</option>
        <option value="1">One</option>
        <option value="2">Two</option>
        <option value="3">Three</option>
      </select>
      <div class="container">
        <small class="form-text text-success"><i class="fa fa-circle"></i> Connected</small>
      </div>

      <div class="sidebar-heading">Tables</div>
      <input type="text" class="form-control border border-left-0 border-bottom-0 border-right-0" placeholder="Search">

      <div class="list-group list-group-flush">
        <a href="#dashboard-details" class="list-group-item list-group-item-action bg-light" data-toggle="collapse">Dashboard</a>
        <div class="list-group list-group-flush collapse columns-list" id="dashboard-details">
          <li class="list-group-item d-flex">
            <div class="justify-content-between">first_name</div>
            <span class="badge badge-info">varchar(255)</span>
          </li>
          <li class="list-group-item d-flex">
            <div class="justify-content-between">last_name</div>
            <span class="badge badge-info right">varchar(255)</span>
          </li>
          <li class="list-group-item d-flex">
            <div class="justify-content-between">age</div>
            <span class="badge badge-info right">int(8)</span>
          </li>
        </div>
        <a href="#shortcuts-details" class="list-group-item list-group-item-action bg-light" data-toggle="collapse">Shortcuts</a>
        <div class="list-group list-group-flush collapse columns-list" id="shortcuts-details">
          <li class="list-group-item d-flex">
            <div class="justify-content-between">first_name</div>
            <span class="badge badge-info">varchar(255)</span>
          </li>
          <li class="list-group-item d-flex">
            <div class="justify-content-between">last_name</div>
            <span class="badge badge-info right">varchar(255)</span>
          </li>
          <li class="list-group-item d-flex">
            <div class="justify-content-between">age</div>
            <span class="badge badge-info right">int(8)</span>
          </li>
        </div>        <a href="#" class="list-group-item list-group-item-action bg-light">Overview</a>
        <a href="#" class="list-group-item list-group-item-action bg-light">Events</a>
        <a href="#" class="list-group-item list-group-item-action bg-light">Profile</a>
        <a href="#" class="list-group-item list-group-item-action bg-light">Status</a>
      </div>
    </div>
    <!-- /#sidebar-wrapper -->

</template>
