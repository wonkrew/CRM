import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Security check function to ensure the user has access to the lead
async function canAccessLead(db, userId, leadId) {
    const lead = await db.collection("submissions").findOne({ _id: new ObjectId(leadId) });
    if (!lead) return false;

    const website = await db.collection("websites").findOne({ _id: lead.websiteId });
    if (!website) return false;
    
    const membership = await db.collection("memberships").findOne({
        userId: new ObjectId(userId),
        organizationId: website.organizationId,
    });

    return !!membership;
}


// GET handler to fetch follow-ups
export async function GET(request, { params }) {
    const { leadId } = params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { db } = await connectToDatabase();
        if (!await canAccessLead(db, session.user.id, leadId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const followUps = await db.collection("followups").aggregate([
            { $match: { leadId: new ObjectId(leadId) } },
            { $sort: { createdAt: -1 } },
            { 
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: { path: "$user", preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    notes: 1,
                    createdAt: 1,
                    reminderAt: 1,
                    userName: "$user.name" // Get user's name
                }
            }
        ]).toArray();
        
        return NextResponse.json(followUps);
    } catch (error) {
        console.error("Failed to fetch follow-ups:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST handler to add a new follow-up
export async function POST(request, { params }) {
    const { leadId } = params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { db } = await connectToDatabase();
        if (!await canAccessLead(db, session.user.id, leadId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { type, notes, details, reminderAt } = body;

        if (!notes || typeof notes !== 'string' || !type) {
            return NextResponse.json({ error: "Invalid payload. Type and notes are required." }, { status: 400 });
        }

        const newFollowUp = {
            leadId: new ObjectId(leadId),
            userId: new ObjectId(session.user.id),
            type, // e.g., "Note", "Call", "Email"
            notes,
            details: details || {}, // For storing extra data like call outcome
            reminderAt: reminderAt ? new Date(reminderAt) : null,
            createdAt: new Date(),
        };

        await db.collection("followups").insertOne(newFollowUp);

        return NextResponse.json({ message: "Follow-up created" }, { status: 201 });
    } catch (error) {
        console.error("Failed to create follow-up:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
} 