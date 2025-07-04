import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Get organization details
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user's organization through membership
    const membership = await db.collection("memberships").findOne({
      userId: new ObjectId(session.user.id)
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const organization = await db.collection("organizations").findOne({
      _id: membership.organizationId
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (err) {
    console.error("Failed to get organization:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Create new organization
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Organization name required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if user is already in an organization
    const existingMembership = await db.collection("memberships").findOne({
      userId: new ObjectId(session.user.id),
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already in an organization" },
        { status: 400 }
      );
    }

    // Create the organization
    const orgResult = await db.collection("organizations").insertOne({
      name,
      ownerId: new ObjectId(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!orgResult.insertedId) {
      throw new Error("Failed to create organization");
    }

    // Create default roles with their permissions
    const { DEFAULT_ROLES, DEFAULT_ROLE_PERMISSIONS } = await import('@/lib/constants');
    const roleIds = {};

    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const roleResult = await db.collection("roles").insertOne({
        name: roleName,
        organizationId: orgResult.insertedId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      });
      roleIds[roleName] = roleResult.insertedId;

      // Create permissions for this role
      const permissionDocs = Object.entries(permissions).flatMap(([resource, actions]) =>
        actions.map(action => ({
          roleId: roleResult.insertedId,
          organizationId: orgResult.insertedId,
          resource,
          action,
          createdAt: new Date()
        }))
      );

      if (permissionDocs.length > 0) {
        await db.collection("role_permissions").insertMany(permissionDocs);
      }
    }

    // Create the membership for the user as owner
    const membershipResult = await db.collection("memberships").insertOne({
      userId: new ObjectId(session.user.id),
      organizationId: orgResult.insertedId,
      role: DEFAULT_ROLES.OWNER, // Set as owner instead of admin
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Assign the owner role to the user
    await db.collection("user_roles").insertOne({
      userId: new ObjectId(session.user.id),
      roleId: roleIds[DEFAULT_ROLES.OWNER],
      organizationId: orgResult.insertedId,
      createdAt: new Date()
    });

    if (!membershipResult.insertedId) {
      // Rollback organization creation if membership creation fails
      await db.collection("organizations").deleteOne({ _id: orgResult.insertedId });
      await db.collection("roles").deleteMany({ organizationId: orgResult.insertedId });
      await db.collection("role_permissions").deleteMany({ organizationId: orgResult.insertedId });
      await db.collection("user_roles").deleteMany({ organizationId: orgResult.insertedId });
      throw new Error("Failed to create membership");
    }

    return NextResponse.json({ 
      success: true, 
      organizationId: orgResult.insertedId.toString(),
      organization: {
        _id: orgResult.insertedId.toString(),
        name,
        ownerId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }, { status: 201 });

  } catch (err) {
    console.error("Failed to create organization:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

// Delete organization
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if user is admin of the organization
    const membership = await db.collection("memberships").findOne({
      userId: new ObjectId(session.user.id),
      organizationId: new ObjectId(organizationId),
      role: "admin"
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to delete this organization" },
        { status: 403 }
      );
    }

    // Delete organization and all related memberships
    await db.collection("organizations").deleteOne({ _id: new ObjectId(organizationId) });
    await db.collection("memberships").deleteMany({ organizationId: new ObjectId(organizationId) });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete organization:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
} 