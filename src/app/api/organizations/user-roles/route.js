import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { ObjectId } from "mongodb";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = session.user.memberships[0].organizationId;
  try {
    const { db } = await connectToDatabase();
    const links = await db.collection("user_roles").aggregate([
      { $match: { orgId: new ObjectId(orgId) } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $lookup: { from: "roles", localField: "roleId", foreignField: "_id", as: "role" } },
      { $unwind: "$role" },
      { $project: { id: 1, userId: 1, roleId: 1, "user.name": 1, "user.email": 1, "role.name": 1 } },
    ]).toArray();
    return new Response(JSON.stringify(links), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = session.user.memberships[0].organizationId;
  if (!await hasPermission(session.user.id, orgId, "role", "assign")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  try {
    const { userId, roleId } = await req.json();
    if (!userId || !roleId) return new Response(JSON.stringify({ error: "userId and roleId required" }), { status: 400 });
    const { db } = await connectToDatabase();
    // ensure role exists in org
    const role = await db.collection("roles").findOne({ _id: new ObjectId(roleId), orgId: new ObjectId(orgId) });
    if (!role) return new Response(JSON.stringify({ error: "Role not found" }), { status: 404 });

    await db.collection("user_roles").updateOne(
      { orgId: new ObjectId(orgId), userId: new ObjectId(userId), roleId: new ObjectId(roleId) },
      { $setOnInsert: { orgId: new ObjectId(orgId), userId: new ObjectId(userId), roleId: new ObjectId(roleId) } },
      { upsert: true }
    );
    await insertAuditLog({
      organizationId: orgId,
      actorId: session.user.id,
      action: "Role Assigned",
      targetType: "user_role",
      targetId: roleId,
      details: { userId, roleId },
    });
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 