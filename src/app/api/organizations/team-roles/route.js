import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { ObjectId } from "mongodb";

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
    const { teamId, roleId } = await req.json();
    if (!teamId || !roleId) return new Response(JSON.stringify({ error: "teamId and roleId required" }), { status: 400 });
    const { db } = await connectToDatabase();
    // ensure role and team belong to org
    const role = await db.collection("roles").findOne({ _id: new ObjectId(roleId), orgId: new ObjectId(orgId) });
    const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId), orgId: new ObjectId(orgId) });
    if (!role || !team) return new Response(JSON.stringify({ error: "Role or Team not found" }), { status: 404 });

    await db.collection("team_roles").updateOne(
      { teamId: new ObjectId(teamId), roleId: new ObjectId(roleId) },
      { $setOnInsert: { teamId: new ObjectId(teamId), roleId: new ObjectId(roleId) } },
      { upsert: true }
    );
    await insertAuditLog({
      organizationId: orgId,
      actorId: session.user.id,
      action: "Team Role Assigned",
      targetType: "team_role",
      targetId: teamId,
      details: { teamId, roleId },
    });
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 