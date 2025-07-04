"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RESOURCES, ACTIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";

export function PermissionMatrix({ organizationId, roleId, isCustomRole, onClose }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission: canManagePermissions } = usePermission(RESOURCES.ROLES, ACTIONS.MANAGE);

  useEffect(() => {
    if (organizationId && roleId) {
      fetchPermissions();
    }
  }, [organizationId, roleId]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(
        `/api/organizations/roles/${roleId}/permissions?organizationId=${organizationId}`
      );
      if (!response.ok) throw new Error("Failed to fetch permissions");
      const data = await response.json();

      // Convert array of permissions to matrix format
      const matrix = {};
      data.forEach((perm) => {
        if (!matrix[perm.resource]) {
          matrix[perm.resource] = {};
        }
        matrix[perm.resource][perm.action] = perm.allow;
      });
      setPermissions(matrix);
    } catch (error) {
      toast.error("Failed to load permissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (resource, action, checked) => {
    if (!canManagePermissions) {
      toast.error("You don't have permission to modify permissions");
      return;
    }

    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...(prev[resource] || {}),
        [action]: checked,
      },
    }));
  };

  const handleSave = async () => {
    if (!isCustomRole) {
      toast.error("Cannot modify default role permissions");
      return;
    }

    if (!canManagePermissions) {
      toast.error("You don't have permission to modify permissions");
      return;
    }

    setSaving(true);
    try {
      // Convert matrix format back to array
      const permissionsArray = [];
      Object.entries(permissions).forEach(([resource, actions]) => {
        Object.entries(actions).forEach(([action, allow]) => {
          permissionsArray.push({ resource, action, allow });
        });
      });

      const response = await fetch(`/api/organizations/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          permissions: permissionsArray,
        }),
      });

      if (!response.ok) throw new Error("Failed to update permissions");
      
      toast.success("Permissions updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update permissions");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Resource</th>
              {Object.values(ACTIONS).map((action) => (
                <th key={action} className="text-center p-2 border-b">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.values(RESOURCES).map((resource) => (
              <tr key={resource}>
                <td className="p-2 border-b">{resource}</td>
                {Object.values(ACTIONS).map((action) => (
                  <td key={action} className="text-center p-2 border-b">
                    <Checkbox
                      checked={permissions[resource]?.[action] || false}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(resource, action, checked)
                      }
                      disabled={!isCustomRole || !canManagePermissions}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isCustomRole || !canManagePermissions || saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
} 