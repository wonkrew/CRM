import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Organization name required" }), { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if user is already in an organization
    const existingMembership = await db.collection("memberships").findOne({
      userId: new ObjectId(session.user.id),
    });

    if (existingMembership) {
        return new Response(JSON.stringify({ error: "User is already in an organization" }), { status: 400 });
    }

    // Create the organization
    const orgResult = await db.collection("organizations").insertOne({
      name,
      ownerId: new ObjectId(session.user.id),
      createdAt: new Date(),
    });
    const organizationId = orgResult.insertedId;

    // Create the membership for the user as admin
    await db.collection("memberships").insertOne({
      userId: new ObjectId(session.user.id),
      organizationId: organizationId,
      role: "admin",
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true, organizationId }), { status: 201 });
    
  } catch (err) {
    console.error("Failed to create organization:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 