import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const organizationId = session.user.memberships[0].organizationId;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const { db } = await connectToDatabase();
    const logs = await db
      .collection("audit_logs")
      .find({ organizationId: new ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return new Response(JSON.stringify(logs), { status: 200 });
  } catch (err) {
    console.error("Failed to fetch audit logs:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 