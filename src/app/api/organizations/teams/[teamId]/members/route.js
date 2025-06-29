import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { insertAuditLog } from "@/lib/audit";
import { ObjectId } from "mongodb";

async function isOrgAdmin(db, userId, organizationId) {
  const membership = await db.collection("memberships").findOne({
    userId: new ObjectId(userId),
    organizationId: new ObjectId(organizationId),
  });
  return membership && membership.role === "admin";
}

export async function GET(req, { params }) {
  const { teamId } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const { db } = await connectToDatabase();
    const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
    if (!team) return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });

    // Check membership
    const isMember = session.user.memberships.some((m) => m.organizationId === team.orgId.toString());
    if (!isMember) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

    const members = await db.collection("team_members").aggregate([
      { $match: { teamId: new ObjectId(teamId) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $project: { id: "$user._id", name: "$user.name", email: "$user.email" } },
    ]).toArray();

    return new Response(JSON.stringify(members), { status: 200 });
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { teamId } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const { db } = await connectToDatabase();
    const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
    if (!team) return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });

    if (!(await isOrgAdmin(db, session.user.id, team.orgId))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "userId required" }), { status: 400 });

    // ensure user exists and belongs to organization
    const membership = await db.collection("memberships").findOne({
      userId: new ObjectId(userId),
      organizationId: new ObjectId(team.orgId),
    });
    if (!membership) return new Response(JSON.stringify({ error: "User not in organization" }), { status: 400 });

    const exists = await db.collection("team_members").findOne({ teamId: new ObjectId(teamId), userId: new ObjectId(userId) });
    if (exists) return new Response(JSON.stringify({ error: "Already in team" }), { status: 409 });

    await db.collection("team_members").insertOne({
      teamId: new ObjectId(teamId),
      userId: new ObjectId(userId),
      addedAt: new Date(),
    });

    await insertAuditLog({
      organizationId: team.orgId,
      actorId: session.user.id,
      action: "Team Member Added",
      targetType: "team_member",
      targetId: teamId,
      details: { userId },
    });

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error("Add team member error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { teamId } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return new Response(JSON.stringify({ error: "userId query param required" }), { status: 400 });

  try {
    const { db } = await connectToDatabase();
    const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
    if (!team) return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });

    if (!(await isOrgAdmin(db, session.user.id, team.orgId))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    await db.collection("team_members").deleteOne({ teamId: new ObjectId(teamId), userId: new ObjectId(userId) });

    await insertAuditLog({
      organizationId: team.orgId,
      actorId: session.user.id,
      action: "Team Member Removed",
      targetType: "team_member",
      targetId: teamId,
      details: { userId },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Remove team member error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 