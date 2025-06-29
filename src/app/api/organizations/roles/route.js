import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { ObjectId } from "mongodb";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const organizationId = session.user.memberships[0].organizationId;

  try {
    const { db } = await connectToDatabase();
    const roles = await db
      .collection("roles")
      .find({ orgId: new ObjectId(organizationId) })
      .project({ name: 1, description: 1, isDefault: 1 })
      .toArray();

    return new Response(JSON.stringify(roles), { status: 200 });
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const organizationId = session.user.memberships[0].organizationId;
  // Only admin can create roles
  const membership = session.user.memberships.find((m) => m.organizationId === organizationId);
  if (!membership || membership.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { name, description = "", permissions = [] } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Role name is required" }), { status: 400 });
    }

    const { db } = await connectToDatabase();

    const duplicate = await db.collection("roles").findOne({ orgId: new ObjectId(organizationId), name });
    if (duplicate) {
      return new Response(JSON.stringify({ error: "Role with same name exists" }), { status: 409 });
    }

    const result = await db.collection("roles").insertOne({
      orgId: new ObjectId(organizationId),
      name,
      description,
      isDefault: false,
      createdBy: new ObjectId(session.user.id),
      createdAt: new Date(),
    });

    // Add any permissions to role_permissions
    if (permissions.length) {
      const rolePermDocs = permissions.map((p) => ({
        roleId: result.insertedId,
        resource: p.resource,
        action: p.action,
        allow: p.allow !== false, // default true
      }));
      await db.collection("role_permissions").insertMany(rolePermDocs);
    }

    await insertAuditLog({
      organizationId,
      actorId: session.user.id,
      action: "Role Created",
      targetType: "role",
      targetId: result.insertedId,
      details: { name },
    });

    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
  } catch (err) {
    console.error("Failed to create role:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 