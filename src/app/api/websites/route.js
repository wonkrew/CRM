import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { hasPermission } from "@/lib/permissions";

// GET websites for an organization
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return new Response(JSON.stringify({ error: "Organization ID is required" }), { status: 400 });
  }

  // Check if user is a member of this organization
  const isMember = session.user.memberships.some(m => m.organizationId === organizationId);
  if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { db } = await connectToDatabase();
    const websites = await db.collection("websites").find({ organizationId: new ObjectId(organizationId) }).toArray();
    return new Response(JSON.stringify(websites), { status: 200 });
  } catch (err) {
    console.error("Error fetching websites:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

// POST new website to an organization
export async function POST(req) {
  const session = await getServerSession(authOptions);
   if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { name, url, organizationId } = await req.json();
    if (!name || !url || !organizationId) {
      return new Response(JSON.stringify({ error: "Website name, URL, and organization ID are required" }), { status: 400 });
    }
    
    // permission check
    if (!await hasPermission(session.user.id, organizationId, "website", "create")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { db } = await connectToDatabase();
    const website = {
      name,
      url,
      organizationId: new ObjectId(organizationId),
      creatorId: new ObjectId(session.user.id),
      createdAt: new Date(),
    };
    const result = await db.collection("websites").insertOne(website);
    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
  } catch (err) {
    console.error("Error creating website:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 