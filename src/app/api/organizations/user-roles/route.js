import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/constants";
import { createAuditLog } from "@/lib/permissions";

// Get user roles
export async function GET(req) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
  }

    // Check if user is a member of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Get user roles
    const query = { orgId: new ObjectId(organizationId) };
    if (userId) {
      query.userId = new ObjectId(userId);
    }

    const userRoles = await db.collection(COLLECTIONS.USER_ROLES)
      .find(query)
      .toArray();

    // Get role details
    const rolesWithDetails = await Promise.all(userRoles.map(async (userRole) => {
      const role = await db.collection(COLLECTIONS.ROLES).findOne({
        _id: userRole.roleId
      });

      const user = await db.collection(COLLECTIONS.USERS).findOne({
        _id: userRole.userId
      });

      return {
        ...userRole,
        role: {
          name: role?.name,
          description: role?.description
        },
        user: {
          name: user?.name,
          email: user?.email
        }
      };
    }));

    return NextResponse.json(rolesWithDetails);

  } catch (err) {
    console.error("Failed to get user roles:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Assign role to user
export async function POST(req) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, userId, roleId, resourceId } = body;

    if (!organizationId || !userId || !roleId) {
      return NextResponse.json({ error: "Organization ID, User ID, and Role ID required" }, { status: 400 });
    }

    // Check if user is an admin of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || membership.role !== 'admin') {
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

    // Check if user exists
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(userId)
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

    // Check if user is already assigned this role
    const existingRole = await db.collection(COLLECTIONS.USER_ROLES).findOne({
      orgId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
      roleId: new ObjectId(roleId),
      ...(resourceId && { resourceId: new ObjectId(resourceId) })
    });

    if (existingRole) {
      return NextResponse.json({ error: "User already has this role" }, { status: 400 });
    }

    // Assign role to user
    const result = await db.collection(COLLECTIONS.USER_ROLES).insertOne({
      orgId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
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
      "user_role",
      result.insertedId.toString(),
      {
        userId,
        roleName: role.name,
        resourceId
      }
    );

    return NextResponse.json({
      success: true,
      userRoleId: result.insertedId.toString()
    }, { status: 201 });

  } catch (err) {
    console.error("Failed to assign user role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Remove role from user
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");
    const roleId = searchParams.get("roleId");
    const resourceId = searchParams.get("resourceId");

    if (!organizationId || !userId || !roleId) {
      return NextResponse.json({ error: "Organization ID, User ID, and Role ID required" }, { status: 400 });
    }

    // Check if user is an admin of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role assignment exists
    const query = {
      orgId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
      roleId: new ObjectId(roleId)
    };

    if (resourceId) {
      query.resourceId = new ObjectId(resourceId);
    }

    const existingRole = await db.collection(COLLECTIONS.USER_ROLES).findOne(query);

    if (!existingRole) {
      return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
    }

    // Get role details for audit log
    const role = await db.collection(COLLECTIONS.ROLES).findOne({
      _id: new ObjectId(roleId)
    });

    // Remove role from user
    await db.collection(COLLECTIONS.USER_ROLES).deleteOne(query);

    // Create audit log
    await createAuditLog(
      organizationId,
      session.user.id,
      "delete",
      "user_role",
      existingRole._id.toString(),
      {
        userId,
        roleName: role?.name,
        resourceId
      }
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to remove user role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 