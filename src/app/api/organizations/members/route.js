import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId = session.user.memberships[0].organizationId;

  try {
    const { db } = await connectToDatabase();
    
    const members = await db.collection("memberships").aggregate([
        { $match: { organizationId: new ObjectId(activeOrganizationId) } },
        { 
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        { 
            $project: {
                id: "$user._id",
                name: "$user.name",
                email: "$user.email"
            }
        }
    ]).toArray();

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
