import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS, RESOURCES, ACTIONS } from "@/lib/constants";
import { insertAuditLog } from "@/lib/audit";

// Get permissions for a role
export async function GET(req, { params }) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const { roleId } = params;

    if (!organizationId || !roleId) {
      return NextResponse.json({ error: "Organization ID and Role ID required" }, { status: 400 });
  }

    // Check if user is a member of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
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

    // Get permissions
    const permissions = await db.collection(COLLECTIONS.ROLE_PERMISSIONS)
      .find({ roleId: new ObjectId(roleId) })
      .toArray();

    return NextResponse.json(permissions);

  } catch (err) {
    console.error("Failed to get role permissions:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Update permissions for a role
export async function PUT(req, { params }) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const { roleId } = params;
    const body = await req.json();
    const { organizationId, permissions = [] } = body;

    if (!organizationId || !roleId) {
      return NextResponse.json({ error: "Organization ID and Role ID required" }, { status: 400 });
  }

    // Check if user is a member of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
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

    // Don't allow modification of default role permissions
    if (!role.isCustom) {
      return NextResponse.json({ error: "Cannot modify default role permissions" }, { status: 400 });
    }

    // Delete existing permissions
    await db.collection(COLLECTIONS.ROLE_PERMISSIONS).deleteMany({
      roleId: new ObjectId(roleId)
    });

    // Insert new permissions
    if (permissions.length > 0) {
      const permissionDocs = permissions.map(p => ({
        roleId: new ObjectId(roleId),
        orgId: new ObjectId(organizationId),
        resource: p.resource,
        action: p.action,
        allow: p.allow,
        createdAt: new Date()
      }));

      await db.collection(COLLECTIONS.ROLE_PERMISSIONS).insertMany(permissionDocs);
    }

    // Create audit log
    await insertAuditLog({
      organizationId,
      actorId: session.user.id,
      action: "update",
      targetType: "role_permissions",
      targetId: roleId,
      details: { roleName: role.name, permissions }
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to update role permissions:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 