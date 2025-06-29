import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET unique forms for a website
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
    const website = await db.collection("websites").findOne({ _id: new ObjectId(websiteId) });
    if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), { status: 404 });
    }

    const isMember = session.user.memberships.some(m => m.organizationId.toString() === website.organizationId.toString());
    if (!isMember) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    // Aggregation pipeline to find unique forms and count their submissions
    const forms = await db.collection("submissions").aggregate([
        { $match: { websiteId: new ObjectId(websiteId) } },
        { 
            $group: { 
                _id: { formId: "$formId", formName: "$formName" },
                submissionCount: { $sum: 1 },
                lastSubmitted: { $max: "$submittedAt" }
            } 
        },
        {
            $project: {
                _id: 0,
                formId: "$_id.formId",
                formName: "$_id.formName",
                submissionCount: 1,
                lastSubmitted: 1
            }
        },
        { $sort: { lastSubmitted: -1 } }
    ]).toArray();
    
    return new Response(JSON.stringify(forms), { status: 200 });

  } catch (err) {
    if (err.name === 'BSONError') {
        return new Response(JSON.stringify({ error: 'Invalid Website ID format' }), { status: 400 });
    }
    console.error("Error fetching forms:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 