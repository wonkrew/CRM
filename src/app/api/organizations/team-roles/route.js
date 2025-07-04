import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS, RESOURCES, ACTIONS } from "@/lib/constants";
import { checkPermission, createAuditLog } from "@/lib/permissions";

// Get team roles
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const teamId = searchParams.get("teamId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Check if user has permission to view team roles
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.TEAM_ROLE,
      ACTIONS.READ
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Get team roles
    const query = { orgId: new ObjectId(organizationId) };
    if (teamId) {
      query.teamId = new ObjectId(teamId);
    }

    const teamRoles = await db.collection(COLLECTIONS.TEAM_ROLES)
      .find(query)
      .toArray();

    // Get role and team details
    const rolesWithDetails = await Promise.all(teamRoles.map(async (teamRole) => {
      const role = await db.collection(COLLECTIONS.ROLES).findOne({
        _id: teamRole.roleId
      });

      const team = await db.collection(COLLECTIONS.TEAMS).findOne({
        _id: teamRole.teamId
      });

      return {
        ...teamRole,
        role: {
          name: role?.name,
          description: role?.description
        },
        team: {
          name: team?.name,
          description: team?.description
        }
      };
    }));

    return NextResponse.json(rolesWithDetails);

  } catch (err) {
    console.error("Failed to get team roles:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Assign role to team
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, teamId, roleId, resourceId } = body;

    if (!organizationId || !teamId || !roleId) {
      return NextResponse.json({ error: "Organization ID, Team ID, and Role ID required" }, { status: 400 });
    }

    // Check if user has permission to assign team roles
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.TEAM_ROLE,
      ACTIONS.CREATE
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role exists and belongs to organization
    const role = await db.collection(COLLECTIONS.ROLES).findOne({
      _id: new ObjectId(roleId),
      orgId: new ObjectId(organizationId)
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if team exists and belongs to organization
    const team = await db.collection(COLLECTIONS.TEAMS).findOne({
      _id: new ObjectId(teamId),
      orgId: new ObjectId(organizationId)
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if team is already assigned this role
    const existingRole = await db.collection(COLLECTIONS.TEAM_ROLES).findOne({
      orgId: new ObjectId(organizationId),
      teamId: new ObjectId(teamId),
      roleId: new ObjectId(roleId),
      ...(resourceId && { resourceId: new ObjectId(resourceId) })
    });

    if (existingRole) {
      return NextResponse.json({ error: "Team already has this role" }, { status: 400 });
    }

    // Assign role to team
    const result = await db.collection(COLLECTIONS.TEAM_ROLES).insertOne({
      orgId: new ObjectId(organizationId),
      teamId: new ObjectId(teamId),
      roleId: new ObjectId(roleId),
      ...(resourceId && { resourceId: new ObjectId(resourceId) }),
      assignedBy: new ObjectId(session.user.id),
      assignedAt: new Date()
    });

    // Create audit log
    await createAuditLog(
      organizationId,
      session.user.id,
      "create",
      "team_role",
      result.insertedId.toString(),
      {
        teamId,
        teamName: team.name,
        roleName: role.name,
        resourceId
      }
    );

    return NextResponse.json({
      success: true,
      teamRoleId: result.insertedId.toString()
    }, { status: 201 });

  } catch (err) {
    console.error("Failed to assign team role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Remove role from team
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const teamId = searchParams.get("teamId");
    const roleId = searchParams.get("roleId");
    const resourceId = searchParams.get("resourceId");

    if (!organizationId || !teamId || !roleId) {
      return NextResponse.json({ error: "Organization ID, Team ID, and Role ID required" }, { status: 400 });
    }

    // Check if user has permission to remove team roles
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.TEAM_ROLE,
      ACTIONS.DELETE
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role assignment exists
    const query = {
      orgId: new ObjectId(organizationId),
      teamId: new ObjectId(teamId),
      roleId: new ObjectId(roleId)
    };

    if (resourceId) {
      query.resourceId = new ObjectId(resourceId);
    }

    const existingRole = await db.collection(COLLECTIONS.TEAM_ROLES).findOne(query);

    if (!existingRole) {
      return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
    }

    // Get team and role details for audit log
    const [team, role] = await Promise.all([
      db.collection(COLLECTIONS.TEAMS).findOne({ _id: new ObjectId(teamId) }),
      db.collection(COLLECTIONS.ROLES).findOne({ _id: new ObjectId(roleId) })
    ]);

    // Remove role from team
    await db.collection(COLLECTIONS.TEAM_ROLES).deleteOne(query);

    // Create audit log
    await createAuditLog(
      organizationId,
      session.user.id,
      "delete",
      "team_role",
      existingRole._id.toString(),
      {
        teamId,
        teamName: team?.name,
        roleName: role?.name,
        resourceId
      }
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to remove team role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 