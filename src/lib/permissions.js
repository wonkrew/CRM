import { getSession } from "next-auth/react";
import { ACTIONS } from './constants';

// Helper function to check a single permission
export async function checkPermission(resource, action, resourceId = null) {
  try {
    const session = await getSession();
    if (!session) return false;

    const queryParams = new URLSearchParams({
      resource,
      action,
      ...(resourceId && { resourceId })
    });

    const response = await fetch(`/api/organizations/permissions/check?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check permission');
    }

    const { hasPermission } = await response.json();
    return hasPermission;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// Helper function to check multiple permissions at once
export async function checkPermissions(permissionChecks) {
  try {
    const session = await getSession();
    if (!session) return {};

    const response = await fetch('/api/organizations/permissions/check-multiple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissionChecks })
    });

    if (!response.ok) {
      throw new Error('Failed to check permissions');
  }

    const results = await response.json();
    return results;
  } catch (error) {
    console.error('Multiple permission checks failed:', error);
    return {};
  }
}

// Helper function to get all permissions for the current user
export async function getUserPermissions() {
  try {
    const session = await getSession();
    if (!session) return new Map();

    const response = await fetch('/api/organizations/permissions/user');
    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
  }

    const { permissions } = await response.json();
    
    // Convert the plain object to a Map of Sets for consistency
    const permissionMap = new Map();
    Object.entries(permissions).forEach(([resource, actions]) => {
      permissionMap.set(resource, new Set(actions));
    });
    
    return permissionMap;
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    return new Map();
  }
  }

// Helper function to log permission changes
export async function logPermissionChange(organizationId, userId, action, details) {
  try {
    const response = await fetch('/api/organizations/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId,
        userId,
        action,
        details,
        timestamp: new Date()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to log permission change');
    }
  } catch (error) {
    console.error('Failed to log permission change:', error);
  }
}

// Helper function to check if a user has a specific permission
export async function hasPermission(resource, action, organizationId) {
  const session = await getSession();
  if (!session?.user?.memberships?.length) return false;

  // If organizationId is provided, check if user is a member of that organization
  if (organizationId) {
    const isMember = session.user.memberships.some(m => m.organizationId === organizationId);
    if (!isMember) return false;
  }

  const permissions = await getUserPermissions();
  const resourcePermissions = permissions.get(resource);
  
  if (!resourcePermissions) return false;
  
  return resourcePermissions.has(action) || resourcePermissions.has(ACTIONS.MANAGE);
} 