import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { hasPermission } from "@/lib/permissions";

export async function PUT(request, { params }) {
  const { leadId } = params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Fields that are allowed to be updated
    const allowedFields = ["status", "projectValue"];
    const updateData = {};

    for (const key in body) {
        if (allowedFields.includes(key)) {
            if (key === 'projectValue') {
                updateData[key] = Number(body[key]); // Ensure project value is a number
            } else {
                updateData[key] = body[key];
            }
        }
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Security check: Ensure the lead belongs to the user's organization
    const lead = await db.collection("submissions").findOne({ _id: new ObjectId(leadId) });
    if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const website = await db.collection("websites").findOne({ _id: lead.websiteId });
    if (!website) {
        return NextResponse.json({ error: "Associated website not found" }, { status: 404 });
    }
    
    // permission check
    if (!await hasPermission(session.user.id, website.organizationId.toString(), "lead", "update")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Perform the update
    const result = await db.collection("submissions").updateOne(
      { _id: new ObjectId(leadId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Lead updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 