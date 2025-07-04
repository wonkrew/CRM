"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembersPageClient from "@/components/members-page-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IconPlus, IconUserShield } from "@tabler/icons-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function TeamsPane({ organizationId }) {
  const [teams, setTeams] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/organizations/teams?organizationId=${organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      setTeams(await res.json());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { fetchTeams(); }, [organizationId]);

  // create team dialog
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const handleCreate = async () => {
    if (!name) return toast.error("Name required");
    try {
      const res = await fetch("/api/organizations/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, organizationId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Team created");
      setOpen(false); setName(""); setDescription("");
      fetchTeams();
    } catch (e) { toast.error(e.message);}  };

  const columns = React.useMemo(() => [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description" },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Teams</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><IconPlus className="w-4 h-4 mr-2"/>New Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Team</DialogTitle></DialogHeader>
            <Input placeholder="Team name" value={name} onChange={(e)=>setName(e.target.value)} className="mb-2"/>
            <Input placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} className="mb-4"/>
            <Button onClick={handleCreate} className="w-full">Create</Button>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable data={teams} columns={columns} manualPagination={false} state={{}} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
}

function RolesPane({ organizationId }) {
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const fetchRoles = async () => {
    try {
      const res = await fetch(`/api/organizations/roles?organizationId=${organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch roles");
      setRoles(await res.json());
    } catch (e) { toast.error(e.message);} finally { setLoading(false); }
  };
  React.useEffect(()=>{ fetchRoles(); }, [organizationId]);

  // create role
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const handleCreate = async () => {
    if (!name) return toast.error("Name required");
    try {
      const res = await fetch("/api/organizations/roles", { 
        method:"POST", 
        headers:{"Content-Type":"application/json"}, 
        body:JSON.stringify({ name, description, organizationId }) 
      });
      if (!res.ok) throw new Error((await res.json()).error||"Failed");
      toast.success("Role created");
      setOpen(false); setName(""); setDescription("");
      fetchRoles();
    } catch(e){ toast.error(e.message);} };

  const resources = [
    { id: "website", actions: ["create", "update", "delete", "read"] },
    { id: "lead", actions: ["read", "update", "assign", "followup:create"] },
    { id: "mapping", actions: ["update"] },
    { id: "role", actions: ["assign", "permissions:update"] },
  ];

  const [permDialogRole, setPermDialogRole] = React.useState(null); // role object
  const [permState, setPermState] = React.useState({}); // key => bool

  const openPermDialog = async (role) => {
    setPermDialogRole(role);
    try {
      const res = await fetch(`/api/organizations/roles/${role._id}/permissions`);
      const list = res.ok ? await res.json() : [];
      const map = {};
      list.forEach((p) => (map[`${p.resource}:${p.action}`] = p.allow !== false));
      setPermState(map);
    } catch (e) { toast.error(e.message); }
  };

  const togglePerm = (resId, act) => {
    const key = `${resId}:${act}`;
    setPermState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePerms = async () => {
    if (!permDialogRole) return;
    const payload = Object.entries(permState).map(([k, allow]) => {
      const [resource, action] = k.split(":");
      return { resource, action, allow };
    });
    try {
      const res = await fetch(`/api/organizations/roles/${permDialogRole._id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast.success("Permissions saved");
      setPermDialogRole(null);
    } catch (e) { toast.error(e.message);}  };

  const columns = React.useMemo(()=>[
    {accessorKey:"name", header:"Name"},
    {accessorKey:"description", header:"Description"},
    {id: "actions", header:"", cell: ({ row }) => (
      <Button size="xs" variant="outline" onClick={()=>openPermDialog(row.original)}>
        <IconUserShield className="w-4 h-4 mr-1"/> Permissions
      </Button>
    )},
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Roles</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><IconPlus className="w-4 h-4 mr-2"/>New Role</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
            <Input placeholder="Role name" value={name} onChange={(e)=>setName(e.target.value)} className="mb-2" />
            <Input placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} className="mb-4" />
            <Button onClick={handleCreate} className="w-full">Create</Button>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable data={roles} columns={columns} manualPagination={false} state={{}} />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {/* Permission Dialog */}
      {permDialogRole && (
        <Dialog open={true} onOpenChange={()=>setPermDialogRole(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Edit Permissions - {permDialogRole.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {resources.map((r)=>(
                <div key={r.id}>
                  <h4 className="font-medium mb-2 capitalize">{r.id}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {r.actions.map((a)=>(
                      <Button key={a} variant={permState[`${r.id}:${a}`]?"default":"outline"} size="sm" onClick={()=>togglePerm(r.id,a)}>
                        {a}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={savePerms}>Save Permissions</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AuditPane({ organizationId }) {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(()=>{
    fetch("/api/organizations/audit-log?limit=100").then(async r=>{
      if(!r.ok) throw new Error("Fetch error");
      setLogs(await r.json());
      setLoading(false);
    }).catch(e=>{ toast.error(e.message); setLoading(false);});
  },[]);

  const columns = React.useMemo(()=>[
    { accessorKey: "createdAt", header:"Time", cell: ({getValue})=> new Date(getValue()).toLocaleString() },
    { accessorKey: "actorId", header:"Actor"},
    { accessorKey: "action", header:"Action"},
    { accessorKey: "details", header:"Details", cell: ({getValue})=> JSON.stringify(getValue())},
  ],[]);

  return (<div className="space-y-4">
    <h3 className="font-semibold">Recent Activity</h3>
    <DataTable data={logs} columns={columns} manualPagination={false} state={{}} />
    {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
  </div>);
}

export default function OrgSettingsClient({ organizationId }) {
  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="audit">Audit Log</TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <MembersPageClient organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="teams">
        <TeamsPane organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="roles">
        <RolesPane organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="audit">
        <AuditPane organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  );
} 