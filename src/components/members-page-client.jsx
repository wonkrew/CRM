"use client";

import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { IconPlus, IconUserShield } from "@tabler/icons-react";

export default function MembersPageClient() {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [roles, setRoles] = React.useState([]);
  const [userRoles, setUserRoles] = React.useState({});

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/organizations/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndLinks = async () => {
    try {
      const [rRes, lRes] = await Promise.all([
        fetch("/api/organizations/roles"),
        fetch("/api/organizations/user-roles"),
      ]);
      if (!rRes.ok || !lRes.ok) throw new Error("Failed roles fetch");
      const rolesData = await rRes.json();
      setRoles(rolesData);
      const links = await lRes.json();
      const map = {};
      links.forEach((l) => (map[l.userId] = l.roleId));
      setUserRoles(map);
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    fetchMembers();
    fetchRolesAndLinks();
  }, []);

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
        body: JSON.stringify({ userId, roleId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Assign failed");
      toast.success("Role updated");
      setUserRoles((prev) => ({ ...prev, [userId]: roleId }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
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
    </div>
  );
} 