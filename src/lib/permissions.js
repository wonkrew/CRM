import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Built-in role presets
const BUILT_IN_ROLE_PERMS = {
  admin: ["*"] , // wildcard
  editor: [
    "website:create",
    "website:update",
    "website:read",
    "lead:update",
    "lead:assign",
    "lead:followup:create",
    "lead:read",
    "mapping:update",
    "team:read",
  ],
  viewer: [
    "website:read",
    "lead:read",
    "team:read",
  ],
};

export async function getEffectivePermissions(userId, organizationId) {
  const { db } = await connectToDatabase();
  const perms = new Set();

  // 1. Built-in membership role
  const membership = await db.collection("memberships").findOne({
    userId: new ObjectId(userId),
    organizationId: new ObjectId(organizationId),
  });
  if (membership) {
    const preset = BUILT_IN_ROLE_PERMS[membership.role];
    if (preset) preset.forEach((p) => perms.add(p));
  }

  // 2. Direct user_roles
  const userRoleLinks = await db
    .collection("user_roles")
    .find({ orgId: new ObjectId(organizationId), userId: new ObjectId(userId) })
    .toArray();
  const roleIds = userRoleLinks.map((r) => r.roleId);

  // 3. Team roles
  const teamIds = (
    await db
      .collection("team_members")
      .find({ userId: new ObjectId(userId) })
      .toArray()
  ).map((tm) => tm.teamId);
  if (teamIds.length) {
    const teamRoleLinks = await db
      .collection("team_roles")
      .find({ teamId: { $in: teamIds } })
      .toArray();
    roleIds.push(...teamRoleLinks.map((r) => r.roleId));
  }

  // 4. Permissions from those roles
  if (roleIds.length) {
    const rolePerms = await db
      .collection("role_permissions")
      .find({ roleId: { $in: roleIds } })
      .toArray();
    rolePerms.forEach((rp) => {
      if (rp.allow !== false) perms.add(`${rp.resource}:${rp.action}`);
    });
  }

  // 5. Explicit permission overrides (permissions collection)
  const directPerms = await db
    .collection("permissions")
    .find({
      orgId: new ObjectId(organizationId),
      assigneeType: "user",
      assigneeId: new ObjectId(userId),
    })
    .toArray();
  directPerms.forEach((p) => {
    const key = `${p.resource}:${p.action}`;
    if (p.allow === false) perms.delete(key);
    else perms.add(key);
  });

  return perms;
}

export async function hasPermission(userId, organizationId, resource, action) {
  const perms = await getEffectivePermissions(userId, organizationId);
  if (perms.has("*")) return true;
  return perms.has(`${resource}:${action}`);
} 