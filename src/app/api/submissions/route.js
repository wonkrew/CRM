import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET submissions for a website
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    return new Response(JSON.stringify({ error: "Website ID is required" }), { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();

    // Security check: Ensure the user has access to this website.
    // First, find the website and its organizationId.
    const website = await db.collection("websites").findOne({ _id: new ObjectId(websiteId) });
    if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), { status: 404 });
    }

    // Then, check if the user is a member of that organization.
    const isMember = session.user.memberships.some(m => m.organizationId === website.organizationId.toString());
    if (!isMember) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    // Fetch submissions for the given websiteId
    const submissions = await db.collection("submissions").find({ websiteId: new ObjectId(websiteId) }).sort({ submittedAt: -1 }).toArray();
    
    return new Response(JSON.stringify(submissions), { status: 200 });

  } catch (err) {
    if (err.name === 'BSONError') {
        return new Response(JSON.stringify({ error: 'Invalid Website ID format' }), { status: 400 });
    }
    console.error("Error fetching submissions:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 