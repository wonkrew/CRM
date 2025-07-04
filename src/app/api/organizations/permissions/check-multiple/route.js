import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { permissionChecks } = await request.json();

    if (!Array.isArray(permissionChecks)) {
      return new Response(
        JSON.stringify({ error: "Permission checks must be an array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { db } = await connectToDatabase();

    // Get user's roles
    const userRoles = await db
      .collection("userRoles")
      .find({
        userId: new ObjectId(session.user.id),
        organizationId: new ObjectId(session.user.organizationId),
      })
      .toArray();

    // Get team roles for user's teams
    const userTeams = await db
      .collection("teamMembers")
      .find({
        userId: new ObjectId(session.user.id),
        organizationId: new ObjectId(session.user.organizationId),
      })
      .toArray();

    const teamRoles = await db
      .collection("teamRoles")
      .find({
        teamId: { $in: userTeams.map((t) => t.teamId) },
        organizationId: new ObjectId(session.user.organizationId),
      })
      .toArray();

    // Get all role IDs
    const roleIds = [
      ...userRoles.map((ur) => ur.roleId),
      ...teamRoles.map((tr) => tr.roleId),
    ];

    // Get all permissions for the user's roles
    const rolePermissions = await db
      .collection("rolePermissions")
      .find({
        roleId: { $in: roleIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Check each permission request
    const results = {};
    permissionChecks.forEach(({ resource, action, resourceId }) => {
      const key = `${resource}:${action}${resourceId ? `:${resourceId}` : ""}`;
      const relevantPermissions = rolePermissions.filter(
        (p) =>
          p.resource === resource &&
          (!resourceId || p.resourceId?.toString() === resourceId)
      );
      results[key] = relevantPermissions.some(
        (p) => p.action === action || p.action === "manage"
      );
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Multiple permission checks failed:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 