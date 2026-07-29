---
title: Sharing & Permissions
summary: "Control who on your team can view or edit individual queries, connections, and folders in a cloud workspace."
icon: material/share-variant
---

In a [cloud workspace](./cloud-storage-team-workspaces.md) you can share individual queries, connections, and folders with fine-grained permissions. Instead of a single shared team folder where everyone can edit everything, you decide who can **view** and who can **edit** each item.

Common uses:

- Give support staff read-only access to a set of queries.
- Hide a connection that touches sensitive data from everyone except named admins.
- Share a single query with just one teammate.

!!! note
    Sharing applies only to **cloud workspaces**. Items in a local workspace are private to your machine and have no sharing options.

## Concepts

1. **Personal folder** — Items here are private to you. They are stored in the cloud but never visible to other members. Personal items always have full edit access for their owner and cannot be shared.
2. **Team folder** — Items here can be shared with other members. Each team item carries its own access settings.
3. **Owner** — The member who created an item. The owner always keeps full edit access and is the only member (besides workspace owners/admins) who can change an item's sharing settings.
4. **Team access** — The general access level granted to *every* member of the workspace for an item. One of:
   - **No access** — Restricted. The item is hidden from members who have no other grant.
   - **Can view** — Members can open and read the item, but not change it.
   - **Can edit** — Members can read and modify the item.
5. **Access grant** — A per-member override. You can grant a specific member **view** or **edit** access regardless of the team access level — useful for restricting an item to *no* team access while still sharing it with named people.

## Who can change sharing

Only the item's **owner**, or a **workspace owner/admin**, can change team access or add and remove access grants.

A member who merely has *edit* access to an item cannot re-share it. This keeps control of who-sees-what with the owner.

## Inheritance

Access is inherited down the folder tree, and a child item can never grant *more* access than its parent folder allows for a given member.

Access resolves in this order:

1. **Workspace owner/admin** — always full edit (bypasses all restrictions).
2. **Item owner** — always full edit on their own items, even if a parent folder is more restrictive.
3. **Personal items** — visible only to the owner.
4. **Everyone else** — the *lower* of the item's own access and the access inherited from its parent folder, walking up the chain.

In practice this means restricting a folder restricts everything inside it for other members, but the folder's owner still keeps full access to their own items.

## Sharing an item

1. Open the query or connection you want to share, or right-click an item in the sidebar.
2. Choose **Share**.
3. In the share dialog:
   - Set **Team access** to control what every member can do (no access, view, or edit).
   - Search for a member and add a per-member **view** or **edit** grant.
   - Change or remove existing grants from the list.

The dialog lists the item's owner, every member with an explicit grant, and the general team access setting. Members without permission to manage sharing see the current settings but cannot change them.

## Defaults

- **Existing team items** keep the previous behavior — they are editable by everyone in the workspace, so nothing you already share changes.
- **New team items** start as **view-only** for other members. Share them explicitly to grant edit access or to restrict them further.

## Moving items

Moving an item into a folder requires **edit** access to that destination folder. You cannot move an item into a folder you can't edit, which prevents working around an item's restrictions by relocating it.
