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


export async function PUT(request, { params }) {
    const { leadId } = params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { db } = await connectToDatabase();
        if (!await canAccessLead(db, session.user.id, leadId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { assigneeId, assigneeName } = await request.json();
        if (!assigneeId) {
            return NextResponse.json({ error: "Assignee ID is required" }, { status: 400 });
        }
        
        // 1. Update the lead document with the assignee's ID
        await db.collection("submissions").updateOne(
            { _id: new ObjectId(leadId) },
            { $set: { assignedTo: new ObjectId(assigneeId) } }
        );

        // 2. Create an "Assignment" activity in the follow-ups collection
        const newFollowUp = {
            leadId: new ObjectId(leadId),
            userId: new ObjectId(session.user.id), // The user who performed the assignment
            type: "Assignment",
            notes: `Lead assigned to ${assigneeName} by ${session.user.name}.`,
            createdAt: new Date(),
        };
        await db.collection("followups").insertOne(newFollowUp);

        return NextResponse.json({ message: "Lead assigned successfully" }, { status: 200 });
    } catch (error) {
        console.error("Failed to assign lead:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
} 