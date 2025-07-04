"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { IconPlus, IconUserShield } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { RoleSelect } from "./role-select";
import { checkPermission } from "@/lib/permissions";

export default function MembersPageClient({ organizationId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [canManageMembers, setCanManageMembers] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchRolesAndLinks();
    checkManagePermission();
  }, [organizationId]);

  const checkManagePermission = async () => {
    const hasPermission = await checkPermission("members", "manage");
    setCanManageMembers(hasPermission);
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/organizations/members?organizationId=${organizationId}`);
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      toast.error("Failed to load members");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndLinks = async () => {
    try {
      const [rolesRes, linksRes] = await Promise.all([
        fetch(`/api/organizations/roles?organizationId=${organizationId}`),
        fetch(`/api/organizations/user-roles?organizationId=${organizationId}`)
      ]);
      if (!rolesRes.ok || !linksRes.ok) throw new Error("Failed to fetch data");
      const [roles, links] = await Promise.all([rolesRes.json(), linksRes.json()]);
      setRoles(roles);
      const roleMap = {};
      links.forEach(link => roleMap[link.userId] = link.roleId);
      setUserRoles(roleMap);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // DataTable columns
  const columns = React.useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => {
          const userId = row.original.id || row.original.userId || row.original._id;
          const currentRole = userRoles[userId] || "";
          return (
            <Select
              value={currentRole}
              onValueChange={(val) => handleAssignRole(userId, val)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    []
  );

  // simple global filter
  const [globalFilter, setGlobalFilter] = React.useState("");

  /* Invite dialog state */
  const [open, setOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [role, setRole] = React.useState("viewer");

  const handleInvite = async () => {
    if (!inviteEmail) return toast.error("Email required");
    try {
      const res = await fetch("/api/organizations/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invite failed");
      }
      toast.success("Invitation sent");
      setOpen(false);
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssignRole = async (userId, roleId) => {
    try {
      const res = await fetch("/api/organizations/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId, organizationId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Assign failed");
      toast.success("Role updated");
      setUserRoles((prev) => ({ ...prev, [userId]: roleId }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail) return;

    try {
      const response = await fetch("/api/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          email: newMemberEmail
        })
      });

      if (!response.ok) throw new Error("Failed to invite member");
      
      toast.success("Member invited successfully");
      setNewMemberEmail("");
      fetchMembers();
    } catch (error) {
      toast.error("Failed to invite member");
      console.error(error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(`/api/organizations/members?organizationId=${organizationId}&memberId=${memberId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to remove member");
      
      toast.success("Member removed successfully");
      fetchMembers();
    } catch (error) {
      toast.error("Failed to remove member");
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        {canManageMembers && (
          <Card className="p-4">
            <form onSubmit={handleInviteMember} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email to invite"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!newMemberEmail}>
                Invite Member
              </Button>
            </form>
          </Card>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <IconPlus className="w-4 h-4 mr-2" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a new member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} className="w-full">
                Send Invite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={members}
        columns={columns}
        manualPagination={false}
        state={{ globalFilter }}
        onGlobalFilterChange={setGlobalFilter}
      />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-4">
        {members.map((member) => (
          <Card key={member._id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{member.email}</h3>
                <p className="text-sm text-muted-foreground">
                  {member.status === "pending" ? "Pending invitation" : "Active"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <RoleSelect
                  organizationId={organizationId}
                  value={member.roleId}
                  onChange={() => fetchMembers()}
                  assigneeType="user"
                  assigneeId={member._id}
                  disabled={!canManageMembers}
                />
                {canManageMembers && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member._id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 