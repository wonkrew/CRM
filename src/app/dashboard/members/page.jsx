import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import OrgSettingsClient from "@/components/org-settings-client";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!session.user.memberships || session.user.memberships.length === 0) {
    redirect("/onboarding");
  }

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
            <OrgSettingsClient />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}