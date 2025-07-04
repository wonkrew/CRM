import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS, RESOURCES, ACTIONS } from "@/lib/constants";
import { insertAuditLog } from "@/lib/audit";

// Get all roles for an organization
export async function GET(req) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

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

    // Get roles with their permissions
    const roles = await db.collection(COLLECTIONS.ROLES)
      .find({ orgId: new ObjectId(organizationId) })
      .toArray();

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(roles.map(async (role) => {
      const permissions = await db.collection(COLLECTIONS.ROLE_PERMISSIONS)
        .find({ roleId: role._id })
        .toArray();

      return {
        ...role,
        permissions: permissions.map(p => ({
          resource: p.resource,
          action: p.action,
          allow: p.allow
        }))
      };
    }));

    return NextResponse.json(rolesWithPermissions);
  } catch (err) {
    console.error("Failed to get roles:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Create a new role
export async function POST(req) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const body = await req.json();
    const { name, description, organizationId, permissions = [] } = body;

    if (!name || !organizationId) {
      return NextResponse.json({ error: "Name and organization ID required" }, { status: 400 });
    }

    // Check if user is an admin of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role name already exists in organization
    const existingRole = await db.collection(COLLECTIONS.ROLES).findOne({
      orgId: new ObjectId(organizationId),
      name: name.trim()
    });

    if (existingRole) {
      return NextResponse.json({ error: "Role name already exists" }, { status: 400 });
    }

    // Create the role
    const roleResult = await db.collection(COLLECTIONS.ROLES).insertOne({
      orgId: new ObjectId(organizationId),
      name: name.trim(),
      description: description?.trim(),
      isCustom: true,
      createdBy: new ObjectId(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create role permissions
    if (permissions.length > 0) {
      const permissionDocs = permissions.map(p => ({
        roleId: roleResult.insertedId,
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
      action: "create",
      targetType: "role",
      targetId: roleResult.insertedId.toString(),
      details: { name, description, permissions }
    });

    return NextResponse.json({
      success: true,
      roleId: roleResult.insertedId.toString()
    }, { status: 201 });

  } catch (err) {
    console.error("Failed to create role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Update a role
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roleId, name, description, organizationId, permissions = [] } = body;

    if (!roleId || !organizationId) {
      return NextResponse.json({ error: "Role ID and organization ID required" }, { status: 400 });
    }

    // Check if user is an admin of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role exists and belongs to organization
    const existingRole = await db.collection(COLLECTIONS.ROLES).findOne({
      _id: new ObjectId(roleId),
      orgId: new ObjectId(organizationId)
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Update role
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      updatedAt: new Date()
    };

    await db.collection(COLLECTIONS.ROLES).updateOne(
      { _id: new ObjectId(roleId) },
      { $set: updateData }
    );

    // Update permissions if provided
    if (permissions.length > 0) {
      // Remove existing permissions
      await db.collection(COLLECTIONS.ROLE_PERMISSIONS).deleteMany({
        roleId: new ObjectId(roleId)
      });

      // Add new permissions
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
      targetType: "role",
      targetId: roleId,
      details: { name, description, permissions }
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to update role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Delete a role
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");
    const organizationId = searchParams.get("organizationId");

    if (!roleId || !organizationId) {
      return NextResponse.json({ error: "Role ID and organization ID required" }, { status: 400 });
    }

    // Check if user is an admin of the organization
    const membership = session.user.memberships?.find(
      m => m.organizationId.toString() === organizationId.toString()
    );

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if role exists and belongs to organization
    const existingRole = await db.collection(COLLECTIONS.ROLES).findOne({
      _id: new ObjectId(roleId),
      orgId: new ObjectId(organizationId)
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Delete role and its permissions
    await Promise.all([
      db.collection(COLLECTIONS.ROLES).deleteOne({ _id: new ObjectId(roleId) }),
      db.collection(COLLECTIONS.ROLE_PERMISSIONS).deleteMany({ roleId: new ObjectId(roleId) }),
      db.collection(COLLECTIONS.USER_ROLES).deleteMany({ roleId: new ObjectId(roleId) }),
      db.collection(COLLECTIONS.TEAM_ROLES).deleteMany({ roleId: new ObjectId(roleId) })
    ]);

    // Create audit log
    await insertAuditLog({
      organizationId,
      actorId: session.user.id,
      action: "delete",
      targetType: "role",
      targetId: roleId,
      details: { name: existingRole.name }
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to delete role:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 