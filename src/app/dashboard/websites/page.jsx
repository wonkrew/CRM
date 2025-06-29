import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import WebsitesPageClient from "@/components/websites-page-client";

async function getWebsites(organizationId, db) {
  if (!organizationId) return [];
  try {
    return await db
      .collection("websites")
      .find({ organizationId: new ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .toArray();
  } catch (e) {
    console.error("Failed to fetch websites:", e);
    return [];
  }
}

export default async function WebsitesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.memberships || session.user.memberships.length === 0) {
    redirect("/onboarding");
  }

  const activeOrganizationId = session.user.memberships[0].organizationId;

  const { db } = await connectToDatabase();
  const websites = await getWebsites(activeOrganizationId, db);

  const safeWebsites = JSON.parse(JSON.stringify(websites));
  const safeSession = JSON.parse(JSON.stringify(session));

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
          <div className="max-w-4xl mx-auto">
            <WebsitesPageClient
              initialWebsites={safeWebsites}
              session={safeSession}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
