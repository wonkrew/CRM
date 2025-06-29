"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { getColumns } from "./columns"

export default function LeadsClient({ leads, standardFields, pageCount, initialState }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Columns are memoized to prevent re-rendering
  const columns = React.useMemo(() => getColumns(standardFields), [standardFields])

  const [sorting, setSorting] = React.useState([
    { id: initialState.sortBy, desc: initialState.sortOrder === 'desc' },
  ])
  const [globalFilter, setGlobalFilter] = React.useState(initialState.q)

  const pagination = React.useMemo(() => ({
    pageIndex: initialState.page - 1,
    pageSize: initialState.pageSize,
  }), [initialState.page, initialState.pageSize])
  
  // This effect will update the URL when the user changes sorting, filtering, or pagination
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set("page", (pagination.pageIndex + 1).toString())
    params.set("pageSize", pagination.pageSize.toString())
    if (globalFilter) {
      params.set("q", globalFilter)
    } else {
      params.delete("q")
    }
    if (sorting.length > 0) {
      params.set("sortBy", sorting[0].id)
      params.set("sortOrder", sorting[0].desc ? "desc" : "asc")
    } else {
      params.delete("sortBy")
      params.delete("sortOrder")
    }
    
    // Using replace to avoid adding to browser history
    router.replace(`?${params.toString()}`)
  }, [pagination, sorting, globalFilter, router, searchParams])


  const handleUpdateLead = async (leadId, field, value) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update lead");
      }
      
      toast.success(`Lead ${field} updated successfully!`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">All Leads</h1>
        <p className="text-muted-foreground">
          View, manage, and track the value of all incoming leads from your
          websites.
        </p>
      </div>
      <DataTable 
        data={leads} 
        columns={columns} 
        pageCount={pageCount}
        onUpdateData={handleUpdateLead} 
        state={{ pagination, sorting, globalFilter }}
        onPaginationChange={(updater) => {
            const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
            router.push(`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: newPagination.pageIndex + 1, pageSize: newPagination.pageSize })}`);
        }}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        manualPagination
        manualSorting
        manualFiltering
      />
    </div>
  )
} 