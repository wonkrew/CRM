import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { COLLECTIONS, RESOURCES, ACTIONS } from "@/lib/constants";
import { checkPermission } from "@/lib/permissions";

// Get audit logs
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actorId = searchParams.get("actorId");
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Check if user has permission to view audit logs
    const hasPermission = await checkPermission(
      session.user.id,
      organizationId,
      RESOURCES.AUDIT_LOG,
      ACTIONS.READ
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Build query
    const query = { orgId: new ObjectId(organizationId) };
    if (actorId) query.actorId = new ObjectId(actorId);
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get total count for pagination
    const total = await db.collection(COLLECTIONS.AUDIT_LOGS).countDocuments(query);

    // Get audit logs with pagination
    const auditLogs = await db.collection(COLLECTIONS.AUDIT_LOGS)
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get actor details
    const auditLogsWithDetails = await Promise.all(auditLogs.map(async (log) => {
      const actor = await db.collection(COLLECTIONS.USERS).findOne({
        _id: log.actorId
      }, {
        projection: { name: 1, email: 1 }
      });

      let targetDetails = {};
      if (log.targetType === "user") {
        const target = await db.collection(COLLECTIONS.USERS).findOne({
          _id: new ObjectId(log.targetId)
        }, {
          projection: { name: 1, email: 1 }
        });
        targetDetails = target || {};
      } else if (log.targetType === "team") {
        const target = await db.collection(COLLECTIONS.TEAMS).findOne({
          _id: new ObjectId(log.targetId)
        }, {
          projection: { name: 1, description: 1 }
        });
        targetDetails = target || {};
      } else if (log.targetType === "role") {
        const target = await db.collection(COLLECTIONS.ROLES).findOne({
          _id: new ObjectId(log.targetId)
        }, {
          projection: { name: 1, description: 1 }
        });
        targetDetails = target || {};
      }

      return {
        ...log,
        actor: actor || {},
        targetDetails
      };
    }));

    return NextResponse.json({
      logs: auditLogsWithDetails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error("Failed to get audit logs:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 