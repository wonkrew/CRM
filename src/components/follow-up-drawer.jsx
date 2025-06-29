"use client"

import * as React from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toDisplayString } from "@/lib/utils"
import { IconMail, IconPhone, IconCalendar, IconClipboardText, IconUserCheck, IconUserCircle } from "@tabler/icons-react"

const activityIcons = {
  Note: <IconClipboardText className="h-5 w-5" />,
  Call: <IconPhone className="h-5 w-5" />,
  Email: <IconMail className="h-5 w-5" />,
  Meeting: <IconCalendar className="h-5 w-5" />,
  Assignment: <IconUserCheck className="h-5 w-5" />,
  Default: <IconUserCircle className="h-5 w-5" />,
}

function ActivityTimeline({ activities }) {
  if (activities.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-8">No activity recorded yet.</div>
  }

  return (
    <div className="space-y-6">
      {activities.map((item) => (
        <div key={item._id} className="flex gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {activityIcons[item.type] || activityIcons.Default}
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-sm">{item.notes}</p>
            {item.details && (
                <div className="text-xs text-muted-foreground border-l-2 pl-2 mt-1">
                    {Object.entries(item.details).map(([key, value]) => (
                        <div key={key}><strong>{toDisplayString(key)}:</strong> {value}</div>
                    ))}
                </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              By {item.userName || "System"} on {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LeadProfile({ lead }) {
    return (
        <div className="space-y-4 p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage />
                    <AvatarFallback className="text-2xl">{lead.name ? lead.name[0] : 'L'}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-2xl font-bold">{toDisplayString(lead.name || 'N/A')}</h2>
                    <p className="text-muted-foreground">{toDisplayString(lead.email || 'No Email')}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-semibold">Status:</span> {lead.status}</div>
                <div><span className="font-semibold">Value:</span> ${lead.projectValue}</div>
                <div className="col-span-2"><span className="font-semibold">Source:</span> {lead.source}</div>
            </div>
        </div>
    )
}

function LeadAssignment({ lead, onAssigneeUpdate }) {
    const [members, setMembers] = React.useState([]);
    const [selectedAssignee, setSelectedAssignee] = React.useState(lead.assignedTo || "");
    
    React.useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch('/api/organizations/members');
                if (!response.ok) throw new Error("Failed to fetch members");
                const data = await response.json();
                setMembers(data);
            } catch (error) {
                toast.error(error.message);
            }
        };
        fetchMembers();
    }, []);

    const handleAssignLead = async (assigneeId) => {
        const assignee = members.find(m => m.id === assigneeId);
        if (!assignee) return;

        try {
            const response = await fetch(`/api/leads/${lead.id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigneeId: assignee.id, assigneeName: assignee.name }),
            });
            if (!response.ok) throw new Error("Failed to assign lead");
            toast.success(`Lead assigned to ${assignee.name}`);
            setSelectedAssignee(assigneeId);
            onAssigneeUpdate(); // This will trigger a refresh of the activity feed
        } catch (error) {
            toast.error(error.message);
        }
    }

    return (
        <div className="mt-6 space-y-2">
            <Label>Assigned To</Label>
            <Select onValueChange={handleAssignLead} value={selectedAssignee}>
                <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                    {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

function LogActivityForm({ leadId, onActivityLogged }) {
    const [note, setNote] = React.useState("");
    const [callOutcome, setCallOutcome] = React.useState("");

    const logActivity = async (type, details) => {
        if (!note.trim()) {
            toast.error("Notes cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`/api/leads/${leadId}/followups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, notes: note, details }),
            });
            if (!response.ok) throw new Error("Failed to log activity");
            toast.success(`${type} logged successfully!`);
            setNote("");
            setCallOutcome("");
            onActivityLogged();
        } catch (error) {
            toast.error(error.message);
        }
    }

    return (
        <Tabs defaultValue="note" className="w-full">
            <TabsList>
                <TabsTrigger value="note">Note</TabsTrigger>
                <TabsTrigger value="call">Call</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
            <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add your notes here..."
                className="my-4"
                rows={4}
            />
            <TabsContent value="note">
                <Button onClick={() => logActivity('Note')}>Save Note</Button>
            </TabsContent>
            <TabsContent value="call" className="space-y-2">
                <Select onValueChange={setCallOutcome} value={callOutcome}>
                    <SelectTrigger><SelectValue placeholder="Select call outcome..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Connected">Connected</SelectItem>
                        <SelectItem value="Left Voicemail">Left Voicemail</SelectItem>
                        <SelectItem value="No Answer">No Answer</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={() => logActivity('Call', { outcome: callOutcome })}>Log Call</Button>
            </TabsContent>
            <TabsContent value="email">
                <Button onClick={() => logActivity('Email')}>Log Email</Button>
            </TabsContent>
        </Tabs>
    )
}


export default function FollowUpDrawer({ lead }) {
  const [activities, setActivities] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/followups`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [lead.id]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
      {/* Left Column */}
      <div className="lg:col-span-1">
        <LeadProfile lead={lead} />
        <LeadAssignment lead={lead} onAssigneeUpdate={fetchActivities} />
      </div>

      {/* Center Column */}
      <div className="lg:col-span-2">
        <LogActivityForm leadId={lead.id} onActivityLogged={fetchActivities} />
        <hr className="my-6" />
        <h3 className="text-lg font-semibold mb-4">Activity History</h3>
        <ScrollArea className="h-[40vh] pr-4">
          {isLoading ? <p>Loading history...</p> : <ActivityTimeline activities={activities} />}
        </ScrollArea>
      </div>
    </div>
  )
} 