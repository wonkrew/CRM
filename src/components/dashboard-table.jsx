"use client";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

const columns = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "projectName",
    header: "Project",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <Badge
          variant={
            status === "New" ? "default" :
            status === "Contacted" ? "secondary" :
            status === "Qualified" ? "info" :
            status === "Converted" ? "success" :
            "destructive"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "source",
    header: "Source",
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => {
      return new Date(row.getValue("submittedAt")).toLocaleDateString();
    },
  },
];

export default function DashboardTable({ data }) {
  return (
    <div className="px-4 lg:px-6">
      <DataTable 
        data={data} 
        columns={columns}
        manualPagination={false}
      />
    </div>
  );
} 