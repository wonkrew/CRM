import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DEFAULT_ROLE_PERMISSIONS, ACTIONS } from "@/lib/constants";

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const { websiteId, formIdentifier, mappings } = await req.json();

        if (!websiteId || !formIdentifier || mappings === undefined) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Security check: Ensure user has rights to this website
        const website = await db.collection("websites").findOne({ _id: new ObjectId(websiteId) });
        if (!website) {
            return new Response(JSON.stringify({ error: "Website not found" }), { status: 404 });
        }

        // Server-side permission check (fallback to role-based default permissions)
        const membership = session.user.memberships?.find(
          m => m.organizationId === website.organizationId.toString()
        );
        let hasPermission = false;
        if (membership && DEFAULT_ROLE_PERMISSIONS[membership.role]) {
          const perms = DEFAULT_ROLE_PERMISSIONS[membership.role]["forms"];
          if (perms && (perms.includes("edit") || perms.includes(ACTIONS.MANAGE))) {
            hasPermission = true;
          }
        }
        if (!hasPermission) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        // Use upsert to create or update the mapping for this specific form
        const result = await db.collection("mappings").updateOne(
            { 
                websiteId: new ObjectId(websiteId), 
                formIdentifier: formIdentifier
            },
            { 
                $set: { 
                    mappings: mappings,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(session.user.id)
                },
                $setOnInsert: {
                    createdAt: new Date(),
                }
            },
            { upsert: true }
        );

        return new Response(JSON.stringify({ success: true, result }), { status: 200 });

    } catch (err) {
        if (err.name === 'BSONError') {
            return new Response(JSON.stringify({ error: 'Invalid Website ID format' }), { status: 400 });
        }
        console.error("Error saving mapping:", err);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
} 