import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  const { roleId } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = session.user.memberships[0].organizationId;
  try {
    const { db } = await connectToDatabase();
    const perms = await db
      .collection("role_permissions")
      .find({ roleId: new ObjectId(roleId) })
      .toArray();
    return new Response(JSON.stringify(perms), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { roleId } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = session.user.memberships[0].organizationId;
  if (!await hasPermission(session.user.id, orgId, "role", "permissions:update")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  try {
    const updated = await req.json(); // [{resource,action,allow}]
    if (!Array.isArray(updated)) return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    const { db } = await connectToDatabase();
    // remove existing perms
    await db.collection("role_permissions").deleteMany({ roleId: new ObjectId(roleId) });
    if (updated.length) {
      const docs = updated.map((p) => ({ roleId: new ObjectId(roleId), resource: p.resource, action: p.action, allow: p.allow !== false }));
      await db.collection("role_permissions").insertMany(docs);
    }
    await insertAuditLog({ organizationId: orgId, actorId: session.user.id, action: "Role Permissions Updated", targetType: "role", targetId: roleId, details: { count: updated.length } });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 