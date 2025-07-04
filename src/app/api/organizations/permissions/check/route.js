import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DEFAULT_ROLE_PERMISSIONS, RESOURCES, ACTIONS, DEFAULT_ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource");
    const action = searchParams.get("action");
    const resourceId = searchParams.get("resourceId");

    if (!resource || !action) {
      return new Response(
        JSON.stringify({ error: "Resource and action are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { db } = await connectToDatabase();

    // Get user's roles
    const userRoles = await db
      .collection("user_roles")
      .find({
        userId: new ObjectId(session.user.id),
        organizationId: new ObjectId(session.user.memberships[0].organizationId),
      })
      .toArray();

    // Get team roles for user's teams
    const userTeams = await db
      .collection("team_members")
      .find({
        userId: new ObjectId(session.user.id),
        organizationId: new ObjectId(session.user.memberships[0].organizationId),
      })
      .toArray();

    const teamRoles = await db
      .collection("team_roles")
      .find({
        teamId: { $in: userTeams.map((t) => t.teamId) },
        organizationId: new ObjectId(session.user.memberships[0].organizationId),
      })
      .toArray();

    // Get all role IDs
    const roleIds = [
      ...userRoles.map((ur) => ur.roleId),
      ...teamRoles.map((tr) => tr.roleId),
    ];

    // Get permissions for all roles
    const rolePermissions = await db
      .collection("role_permissions")
      .find({
        roleId: { $in: roleIds.map((id) => new ObjectId(id)) },
        resource,
        ...(resourceId && { resourceId: new ObjectId(resourceId) }),
      })
      .toArray();

    // Check if any role has the required permission
    let hasPermission = rolePermissions.some(
      (p) => p.action === action || p.action === "manage"
    );

    // If not found in DB, fallback to default role permissions (for built-in roles)
    if (!hasPermission) {
      // Get user's org membership role (owner/admin/member/viewer)
      const membership = session.user.memberships?.find(
        m => m.organizationId === session.user.memberships[0].organizationId
      );
      if (membership && DEFAULT_ROLE_PERMISSIONS[membership.role]) {
        const perms = DEFAULT_ROLE_PERMISSIONS[membership.role][resource];
        if (perms && (perms.includes(action) || perms.includes(ACTIONS.MANAGE))) {
          hasPermission = true;
        }
      }
    }

    return new Response(JSON.stringify({ hasPermission }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Permission check failed:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 