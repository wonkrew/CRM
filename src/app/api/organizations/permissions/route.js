import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS, RESOURCES, ACTIONS } from "@/lib/constants";
import { checkPermission, createAuditLog } from "@/lib/permissions";

// Get permissions
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const assigneeType = searchParams.get("assigneeType"); // "user", "team", or "role"
    const assigneeId = searchParams.get("assigneeId");
    const resource = searchParams.get("resource");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Check if user has permission to view permissions
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.PERMISSION,
      ACTIONS.READ
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Build query
    const query = { orgId: new ObjectId(organizationId) };
    if (assigneeType) query.assigneeType = assigneeType;
    if (assigneeId) query.assigneeId = new ObjectId(assigneeId);
    if (resource) query.resource = resource;

    const permissions = await db.collection(COLLECTIONS.PERMISSIONS)
      .find(query)
      .toArray();

    // Get assignee details
    const permissionsWithDetails = await Promise.all(permissions.map(async (permission) => {
      let assigneeDetails = {};

      if (permission.assigneeType === "user") {
        const user = await db.collection(COLLECTIONS.USERS).findOne({
          _id: permission.assigneeId
        });
        assigneeDetails = {
          name: user?.name,
          email: user?.email
        };
      } else if (permission.assigneeType === "team") {
        const team = await db.collection(COLLECTIONS.TEAMS).findOne({
          _id: permission.assigneeId
        });
        assigneeDetails = {
          name: team?.name,
          description: team?.description
        };
      } else if (permission.assigneeType === "role") {
        const role = await db.collection(COLLECTIONS.ROLES).findOne({
          _id: permission.assigneeId
        });
        assigneeDetails = {
          name: role?.name,
          description: role?.description
        };
      }

      return {
        ...permission,
        assignee: assigneeDetails
      };
    }));

    return NextResponse.json(permissionsWithDetails);

  } catch (err) {
    console.error("Failed to get permissions:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Create or update permission
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      organizationId,
      assigneeType,
      assigneeId,
      resource,
      action,
      allow,
      resourceId
    } = body;

    if (!organizationId || !assigneeType || !assigneeId || !resource || !action) {
      return NextResponse.json({
        error: "Organization ID, assignee type, assignee ID, resource, and action required"
      }, { status: 400 });
    }

    // Validate assigneeType
    if (!["user", "team", "role"].includes(assigneeType)) {
      return NextResponse.json({ error: "Invalid assignee type" }, { status: 400 });
    }

    // Check if user has permission to manage permissions
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.PERMISSION,
      ACTIONS.CREATE
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if assignee exists
    let assignee;
    if (assigneeType === "user") {
      assignee = await db.collection(COLLECTIONS.USERS).findOne({
        _id: new ObjectId(assigneeId)
      });
    } else if (assigneeType === "team") {
      assignee = await db.collection(COLLECTIONS.TEAMS).findOne({
        _id: new ObjectId(assigneeId),
        orgId: new ObjectId(organizationId)
      });
    } else if (assigneeType === "role") {
      assignee = await db.collection(COLLECTIONS.ROLES).findOne({
        _id: new ObjectId(assigneeId),
        orgId: new ObjectId(organizationId)
      });
    }

    if (!assignee) {
      return NextResponse.json({ error: `${assigneeType} not found` }, { status: 404 });
    }

    // Create or update permission
    const query = {
      orgId: new ObjectId(organizationId),
      assigneeType,
      assigneeId: new ObjectId(assigneeId),
      resource,
      action,
      ...(resourceId && { resourceId: new ObjectId(resourceId) })
    };

    const update = {
      $set: {
        allow,
        updatedBy: new ObjectId(session.user.id),
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdBy: new ObjectId(session.user.id),
        createdAt: new Date()
      }
    };

    const result = await db.collection(COLLECTIONS.PERMISSIONS).updateOne(
      query,
      update,
      { upsert: true }
    );

    // Create audit log
    await createAuditLog(
      organizationId,
      session.user.id,
      result.upsertedCount ? "create" : "update",
      "permission",
      result.upsertedId?.toString() || query,
      {
        assigneeType,
        assigneeId,
        resource,
        action,
        allow,
        resourceId
      }
    );

    return NextResponse.json({
      success: true,
      permissionId: result.upsertedId?.toString()
    }, { status: result.upsertedCount ? 201 : 200 });

  } catch (err) {
    console.error("Failed to create/update permission:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Delete permission
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const permissionId = searchParams.get("permissionId");

    if (!organizationId || !permissionId) {
      return NextResponse.json({ error: "Organization ID and Permission ID required" }, { status: 400 });
    }

    // Check if user has permission to delete permissions
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.PERMISSION,
      ACTIONS.DELETE
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Check if permission exists
    const permission = await db.collection(COLLECTIONS.PERMISSIONS).findOne({
      _id: new ObjectId(permissionId),
      orgId: new ObjectId(organizationId)
    });

    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Delete permission
    await db.collection(COLLECTIONS.PERMISSIONS).deleteOne({
      _id: new ObjectId(permissionId)
    });

    // Create audit log
    await createAuditLog(
      organizationId,
      session.user.id,
      "delete",
      "permission",
      permissionId,
      {
        assigneeType: permission.assigneeType,
        assigneeId: permission.assigneeId,
        resource: permission.resource,
        action: permission.action
      }
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Failed to delete permission:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 