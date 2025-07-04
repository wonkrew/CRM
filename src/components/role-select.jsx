import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function RoleSelect({
  organizationId,
  value,
  onChange,
  assigneeType = "user", // "user" or "team"
  assigneeId,
  resourceId,
  disabled = false
}) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchRoles();
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`/api/organizations/roles?organizationId=${organizationId}`);
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (roleId) => {
    if (!organizationId) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      // First, remove existing role if any
      if (value) {
        const deleteUrl = new URL(
          `/api/organizations/${assigneeType}-roles`,
          window.location.origin
        );
        deleteUrl.searchParams.set("organizationId", organizationId);
        deleteUrl.searchParams.set(`${assigneeType}Id`, assigneeId);
        deleteUrl.searchParams.set("roleId", value);
        if (resourceId) deleteUrl.searchParams.set("resourceId", resourceId);

        const deleteResponse = await fetch(deleteUrl, {
          method: "DELETE"
        });
        if (!deleteResponse.ok) throw new Error("Failed to remove existing role");
      }

      // Then assign new role
      const response = await fetch(`/api/organizations/${assigneeType}-roles?organizationId=${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          [`${assigneeType}Id`]: assigneeId,
          roleId,
          ...(resourceId && { resourceId })
        })
      });

      if (!response.ok) throw new Error("Failed to assign role");
      
      onChange(roleId);
      toast.success("Role updated successfully");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  };

  if (!organizationId) {
    return (
      <Select disabled>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="No organization selected" />
        </SelectTrigger>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Loading roles..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={handleRoleChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role._id} value={role._id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 