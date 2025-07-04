import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import DashboardClient from "@/components/dashboard-client"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import DashboardTable from "@/components/dashboard-table"
import data from "./data.json"



async function getWebsites(organizationId, db) {
  if (!organizationId) return []
  try {
    return await db
      .collection("websites")
      .find({ organizationId: new ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .toArray()
  } catch (e) {
    console.error("Failed to fetch websites:", e)
    return []
  }
}

async function getSubmissions(websiteId, db) {
  if (!websiteId) return []
  try {
    return await db
      .collection("submissions")
      .find({ websiteId: new ObjectId(websiteId) })
      .sort({ submittedAt: -1 })
      .toArray()
  } catch (e) {
    console.error("Failed to fetch submissions:", e)
    return []
  }
}

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }
  
  if (!session.user.memberships || session.user.memberships.length === 0) {
    redirect("/onboarding")
  }

  const activeOrganizationId = session.user.memberships[0].organizationId

  const { db } = await connectToDatabase()
  const websites = await getWebsites(activeOrganizationId, db)
  
  // Pre-fetch submissions for the first website to avoid an empty state on load
  const initialSubmissions = await getSubmissions(websites[0]?._id, db)
  
  const safeWebsites = JSON.parse(JSON.stringify(websites))
  const safeSubmissions = JSON.parse(JSON.stringify(initialSubmissions))
  const safeSession = JSON.parse(JSON.stringify(session))

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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DashboardTable data={data} />
            </div>
          </div>
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
            <DashboardClient
              initialWebsites={safeWebsites}
              initialSubmissions={safeSubmissions}
              session={safeSession}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
