import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import FormsPageClient from "@/components/forms-page-client";
import PlatformInstructions from "@/components/PlatformInstructions";

async function getWebsiteDetails(websiteId, userId) {
    const { db } = await connectToDatabase();
    const website = await db.collection("websites").findOne({ _id: new ObjectId(websiteId) });
    if (!website) return null;
    const membership = await db.collection("memberships").findOne({
        userId: new ObjectId(userId),
        organizationId: website.organizationId,
    });
    if (!membership) return null;
    return website;
}

async function getFormsForWebsite(websiteId) {
    const { db } = await connectToDatabase();
    const forms = await db.collection("submissions").aggregate([
        { $match: { websiteId: new ObjectId(websiteId) } },
        { 
            $group: { 
                _id: { 
                    formId: { $ifNull: ["$formId", "$formName"] },
                    formName: { $ifNull: ["$formName", "$formId", "Untitled Form"] }
                },
                submissionCount: { $sum: 1 },
                lastSubmitted: { $max: "$submittedAt" }
            } 
        },
        {
            $project: {
                _id: 0,
                formId: "$_id.formId",
                formName: "$_id.formName",
                submissionCount: 1,
                lastSubmitted: 1
            }
        },
        { $sort: { lastSubmitted: -1 } }
    ]).toArray();
    
    // Additional processing to ensure clean form names
    return forms.map(form => ({
        ...form,
        formName: form.formId || form.formId || "Untitled Form",
        formId: form.formId || form.formName || null
    }));
}

export default async function WebsiteFormsPage({ params: { websiteId } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const website = await getWebsiteDetails(websiteId, session.user.id);
    if (!website) {
        return (
            <div className="p-8"><h2>Website not found or access denied.</h2></div>
        )
    }

    const forms = await getFormsForWebsite(websiteId);
    const safeForms = JSON.parse(JSON.stringify(forms));

    return (
         <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <main className="p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <Breadcrumb className="mb-4">
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/dashboard/websites">Websites</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{website.name}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold">Discovered Forms</h1>
                            <p className="text-muted-foreground">Forms that have received at least one submission on <span className="font-semibold text-primary">{website.name}</span>.</p>
                        </div>
                        <PlatformInstructions websiteId={websiteId} />
                        <FormsPageClient websiteId={websiteId} forms={safeForms} />
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
 