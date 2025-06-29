"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LeadsTable({ leads }) {
  const toDisplayString = (val) => {
    if (val == null) return "";
    if (typeof val === "object") {
      if (Array.isArray(val)) return val.length === 0 ? "[]" : JSON.stringify(val);
      if (Object.keys(val).length === 0) return ""; // empty object, treat as blank
      return JSON.stringify(val);
    }
    return String(val);
  };

  if (!leads || leads.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium">No leads yet.</h3>
        <p className="text-muted-foreground mt-1">
          Once your forms receive submissions, they will appear here as structured leads.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="text-right">Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={toDisplayString(lead.id)}>
              <TableCell>
                <div className="font-medium">{toDisplayString(lead.name)}</div>
                <div className="text-sm text-muted-foreground">{toDisplayString(lead.email)}</div>
                {lead.phone !== "N/A" && <div className="text-sm text-muted-foreground">{toDisplayString(lead.phone)}</div>}
              </TableCell>
              <TableCell>
                 <div className="font-medium">{toDisplayString(lead.websiteName)}</div>
                 <div className="text-sm text-muted-foreground">{toDisplayString(lead.formName)}</div>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="max-w-xs truncate">{toDisplayString(lead.message)}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-md">{toDisplayString(lead.message)}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {lead.company !== "N/A" && <Badge variant="secondary" className="mt-2">{toDisplayString(lead.company)}</Badge>}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {toDisplayString(new Date(lead.submittedAt).toLocaleDateString())}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 