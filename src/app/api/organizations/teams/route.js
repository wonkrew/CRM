import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { ObjectId } from "mongodb";

// GET: List teams for the active organization
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const organizationId = session.user.memberships[0].organizationId;

  try {
    const { db } = await connectToDatabase();
    const teams = await db
      .collection("teams")
      .find({ orgId: new ObjectId(organizationId) })
      .project({ name: 1, description: 1 })
      .toArray();

    return new Response(JSON.stringify(teams), { status: 200 });
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

// POST: Create a new team
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const organizationId = session.user.memberships[0].organizationId;
  // Only admins/editors can create teams
  const membership = session.user.memberships.find((m) => m.organizationId === organizationId);
  if (!membership || !["admin", "editor"].includes(membership.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { name, description = "" } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Team name is required" }), { status: 400 });
    }
    const { db } = await connectToDatabase();
    const result = await db.collection("teams").insertOne({
      orgId: new ObjectId(organizationId),
      name,
      description,
      createdBy: new ObjectId(session.user.id),
      createdAt: new Date(),
    });

    // Audit
    await insertAuditLog({
      organizationId,
      actorId: session.user.id,
      action: "Team Created",
      targetType: "team",
      targetId: result.insertedId,
      details: { name },
    });

    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
  } catch (err) {
    console.error("Failed to create team:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 