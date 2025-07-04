import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
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

    // Get role details
    const roles = await db
      .collection("roles")
      .find({
        _id: { $in: roleIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Format permissions with role information
    const permissions = rolePermissions.map((permission) => {
      const role = roles.find((r) => r._id.toString() === permission.roleId.toString());
      return {
        ...permission,
        roleName: role?.name || "Unknown Role",
        isCustomRole: role?.isCustom || false,
      };
    });

    return new Response(JSON.stringify({ permissions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 