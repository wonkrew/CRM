import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Insert an audit record.
 * @param {Object} params
 * @param {string|ObjectId} params.organizationId
 * @param {string|ObjectId} params.actorId - user performing the action
 * @param {string} params.action - Human-readable verb, e.g., "Team Created"
 * @param {string} params.targetType - e.g., "team", "role", "member"
 * @param {string|ObjectId} params.targetId
 * @param {object} [params.details] - Additional JSON payload
 */
export async function insertAuditLog({ organizationId, actorId, action, targetType, targetId, details = {} }) {
  const { db } = await connectToDatabase();
  await db.collection("audit_logs").insertOne({
    organizationId: new ObjectId(organizationId),
    actorId: new ObjectId(actorId),
    action,
    targetType,
    targetId: targetId ? new ObjectId(targetId) : undefined,
    details,
    createdAt: new Date(),
  });
} 