import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DEFAULT_ROLES, DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.memberships?.length) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { db } = await connectToDatabase();
    const organizationId = session.user.memberships[0].organizationId;

    // Check if user is owner
    const membership = await db.collection("memberships").findOne({
      userId: new ObjectId(session.user.id),
      organizationId: new ObjectId(organizationId),
      role: "owner"
    });

    if (!membership) {
      return new Response(JSON.stringify({ error: "Only owners can fix permissions" }), { status: 403 });
    }

    // Create owner role if it doesn't exist
    let ownerRole = await db.collection("roles").findOne({
      name: DEFAULT_ROLES.OWNER,
      organizationId: new ObjectId(organizationId)
    });

    if (!ownerRole) {
      const roleResult = await db.collection("roles").insertOne({
        name: DEFAULT_ROLES.OWNER,
        organizationId: new ObjectId(organizationId),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      });
      ownerRole = { _id: roleResult.insertedId };
    }

    // Delete existing permissions for this role
    await db.collection("role_permissions").deleteMany({
      roleId: ownerRole._id
    });

    // Create all owner permissions
    const ownerPermissions = DEFAULT_ROLE_PERMISSIONS[DEFAULT_ROLES.OWNER];
    const permissionDocs = Object.entries(ownerPermissions).flatMap(([resource, actions]) =>
      actions.map(action => ({
        roleId: ownerRole._id,
        organizationId: new ObjectId(organizationId),
        resource,
        action,
        createdAt: new Date()
      }))
    );

    if (permissionDocs.length > 0) {
      await db.collection("role_permissions").insertMany(permissionDocs);
    }

    // Ensure user has the owner role assigned
    await db.collection("user_roles").updateOne(
      {
        userId: new ObjectId(session.user.id),
        organizationId: new ObjectId(organizationId)
      },
      {
        $set: {
          roleId: ownerRole._id,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return new Response(JSON.stringify({ success: true, message: "Owner permissions fixed" }), { status: 200 });
  } catch (err) {
    console.error("Failed to fix owner permissions:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 