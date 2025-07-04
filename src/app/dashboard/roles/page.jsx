"use client";

import { useSession } from "next-auth/react";
import { RoleManagement } from "@/components/role-management";
import { usePermission } from "@/hooks/use-permission";
import { RESOURCES, ACTIONS } from "@/lib/constants";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

function RolesContent() {
  const { data: session, status } = useSession();
  const { hasPermission, loading } = usePermission(RESOURCES.ROLES, ACTIONS.VIEW);

  if (status === "loading" || loading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission) {
    return <div>You don't have permission to view roles.</div>;
  }

  // Get the current organization ID from the first membership
  const organizationId = session?.user?.memberships?.[0]?.organizationId;

  if (!organizationId) {
    return <div>No organization found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Role Management</h1>
      </div>
      <RoleManagement organizationId={organizationId} />
    </div>
  );
}

export default function RolesPage() {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={<div>Loading...</div>}>
              <RolesContent />
            </Suspense>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 