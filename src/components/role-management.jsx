import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PermissionMatrix } from "./permission-matrix";

export function RoleManagement({ organizationId }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchRoles();
  }, [organizationId]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`/api/organizations/roles?organizationId=${organizationId}`);
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      toast.error("Failed to load roles");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch("/api/organizations/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: newRole.name,
          description: newRole.description
        })
      });

      if (!response.ok) throw new Error("Failed to create role");
      
      toast.success("Role created successfully");
      setShowCreateDialog(false);
      setNewRole({ name: "", description: "" });
      fetchRoles();
    } catch (error) {
      toast.error("Failed to create role");
      console.error(error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const response = await fetch(`/api/organizations/roles?organizationId=${organizationId}&roleId=${roleId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete role");
      
      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (error) {
      toast.error("Failed to delete role");
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading roles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Roles</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Create Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Enter role description"
                />
              </div>
              <Button onClick={handleCreateRole} disabled={!newRole.name}>
                Create Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role._id} className={role.isCustom ? "" : "bg-muted"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {role.name}
              </CardTitle>
              {role.isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRole(role._id)}
                >
                  Delete
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {role.description || "No description"}
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-2 p-0"
                onClick={() => setSelectedRole(role)}
              >
                Manage Permissions
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRole && (
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Permissions for {selectedRole.name}</DialogTitle>
            </DialogHeader>
            <PermissionMatrix
              organizationId={organizationId}
              roleId={selectedRole._id}
              isCustomRole={selectedRole.isCustom}
              onClose={() => setSelectedRole(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 