---
title: Cloud Workspaces
summary: "Store your connections and queries in the cloud to work across multiple machines, or collaborate with others."
old_url: "https://docs.beekeeperstudio.io/docs/cloud-storage-team-workspaces"
icon: material/cloud-sync
---


Workspaces make it easy to work on multiple computers by storing your data (connections and queries) in the cloud.

Even better, workspaces allow multiple people to work from the same set of data collaboratively.

Queries and Connections stored in a workspace are only available for use through the Beekeeper Studio app, not through a web interface.

![Image Alt Tag](../assets/images/cloud-storage-team-workspaces-28.png)

## Concepts

1. **Workspace** - An online collaborative space for `members` to work on `queries` and `connections`. You get one of these when you create a subscription on the [account dashboard](https://app.beekeeperstudio.io)
2. **Workspace Member** - Someone with access to view and edit queries & connections.
3. **Workspace Admin** - A workspace member with additional privileges, including the ability to invite new users to the workspace.
4. **Workspace Owner** - The person who created the workspace. Owners can add and remove members, promote members to admins, and manage the workspace.
5. **Personal Folder** - Every workspace member has a `personal` folder where new queries and connections are saved by default. Items in your personal folder are *not* shared with others.
6. **Team Folder** - If you want to share a connection or query with teammates, move it to the team folder. Everyone in the workspace has access to this folder.

## Workspace Access

Workspaces are free so long as you maintain an active Beekeeper Studio subscription.

## Getting Started

It only takes a few minutes to get started with workspaces.

When connected to a Workspace, you can only use connections and queries that are saved into that workspace (you can't use connections or queries from your local workspace). This makes cloud workspaces great for segmenting database tasks by client, team, or project.

Don't worry - You can easily import existing queries and connections to your workspace.

<video controls>
    <source id="workspaces" type="video/mp4" src="https://assets.beekeeperstudio.io/workspaces-walkthrough.mp4" />
</video>
<small>Video walkthrough of how to use workspaces</small>

### 1. Sign up and create a workspace

Click the `(+)` button on the global sidebar to create a workspace. Give it any name you like! If you don't yet have a Beekeeper Studio workspace account you will be forwarded to the web interface to create one.

### 2. Add connections to your workspace

Click `import` to move connections from your existing local workspace to your cloud workspace, or just create new connections like normal.

Any connections added to the workspace will be saved in the cloud.

### 3. Connect to a database & add queries

Once connected to a workspace connection you'll be able to use Beekeeper Studio as normal. The difference is that you can only used saved queries that are part of your cloud workspace.

As with connections you can `import` your local queries to your workspace and optionally share them with your team.

### 4. Share assets with your team

By default when you add a connection or query to a workspace they will be stored in the personal folder. While they're saved in the cloud, only you have access to items in the personal folder.

If you want to share something with your workspace team, right click the connection/query and select `Move to team`.

Items in your `team` folder are accessible by all workspace members.

## Managing Workspace Members

### Inviting Users

Both workspace owners and admins can invite new users to join the workspace:

1. Sign in to your workspace in Beekeeper Studio
2. Click on the workspace name in the sidebar
3. Select "Invite Users" from the menu
4. Enter the email address of the person you want to invite
5. The invitee will receive an email with instructions to join your workspace

### Managing Admin Privileges

The workspace owner can promote regular members to admins:

1. Sign in to the [Beekeeper Studio dashboard][dashboard]
2. Navigate to your workspace settings
3. Find the member in the list and click "Promote to Admin"

Admins can invite new users but cannot promote other members to admin status or remove the admin status of other members. Only the workspace owner has these privileges.

## Deleting a Workspace

The owner of the workspace can delete it from the [dashboard][dashboard]. If you delete your workspace, your data will be archived for 30 days, then permanently deleted with no way to recover it.


[dashboard]: https://app.beekeeperstudio.io

