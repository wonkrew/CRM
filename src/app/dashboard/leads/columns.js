"use client"
import React from "react"
import {
  IconArrowUp,
  IconArrowDown,
  IconDotsVertical,
  IconFileText,
  IconMessagePlus,
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerDescription,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toDisplayString } from "@/lib/utils"
import FollowUpDrawer from "@/components/follow-up-drawer"

const SortableHeader = ({ column, children }) => {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="px-2"
    >
      {children}
      {column.getIsSorted() === "asc" && <IconArrowUp className="ml-2 h-4 w-4" />}
      {column.getIsSorted() === "desc" && <IconArrowDown className="ml-2 h-4 w-4" />}
    </Button>
  )
}

// Helper component to render raw data in a readable format
const RawDataViewer = ({ data }) => (
  <pre className="mt-2 rounded-md bg-slate-950 p-4">
    <code className="text-white">{JSON.stringify(data, null, 2)}</code>
  </pre>
)

// Cell component for editable currency input
const EditableValueCell = ({ getValue, row: { index }, column: { id }, table }) => {
    const initialValue = getValue()
    const [value, setValue] = React.useState(initialValue)

    const onBlur = () => {
        table.options.meta?.updateData(index, id, value)
    }

    React.useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    return (
        <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            className="h-8 w-24"
        />
    )
}

// Cell component for status dropdown
const StatusCell = ({ getValue, row: { index }, column: { id }, table }) => {
    const initialValue = getValue()
    const [value, setValue] = React.useState(initialValue)

    React.useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    const onValueChange = (newValue) => {
        setValue(newValue)
        table.options.meta?.updateData(index, id, newValue)
    }

    const statuses = ["New", "Assigned", "Contacted", "Interested", "Customer"]

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="h-8 w-32">
                <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
                {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                        {status}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const getColumns = (standardFields = []) => {
  const mappedColumns = standardFields.map((field) => ({
    accessorKey: field,
    header: ({ column }) => <SortableHeader column={column}>{toDisplayString(field)}</SortableHeader>,
    cell: ({ getValue }) => toDisplayString(getValue()),
  }))

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...mappedColumns,
    {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: StatusCell,
    },
    {
        accessorKey: "projectValue",
        header: ({ column }) => <SortableHeader column={column}>Project Value ($)</SortableHeader>,
        cell: EditableValueCell
    },
    {
        accessorKey: "source",
        header: ({ column }) => <SortableHeader column={column}>Source</SortableHeader>,
    },
    {
      accessorKey: "submittedAt",
      header: ({ column }) => <SortableHeader column={column}>Submitted</SortableHeader>,
      cell: ({ row }) => new Date(row.original.submittedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <IconDotsVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              
              {/* Follow-up Drawer Trigger */}
              <Drawer className="w-full h-full">
                <DrawerTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <IconMessagePlus className="mr-2 h-4 w-4" />
                    <span>Follow-up</span>
                  </DropdownMenuItem>
                </DrawerTrigger>
                <DrawerContent className="w-[100vw]  h-[100vh]">
                  <DrawerHeader>
                    <DrawerTitle>Lead Follow-Up</DrawerTitle>
                    <DrawerDescription>
                      Track and manage all interactions with this lead.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4">
                    <FollowUpDrawer lead={row.original} />
                  </div>
                </DrawerContent>
              </Drawer>

              <DropdownMenuSeparator />

              {/* Raw Data Dialog Trigger */}
              <Dialog>
                  <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <IconFileText className="mr-2 h-4 w-4" />
                          View Raw Data
                      </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Raw Submission Data</DialogTitle>
                      </DialogHeader>
                      <RawDataViewer data={row.original.rawData} />
                  </DialogContent>
              </Dialog>

            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}