import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import FieldMappingClient from "@/components/field-mapping-client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// This is a server component, so we can fetch data directly.
async function getWebsiteDetails(websiteId, userId) {
  const { db } = await connectToDatabase();
  const website = await db
    .collection("websites")
    .findOne({ _id: new ObjectId(websiteId) });

  if (!website) return null;

  // Security check: ensure user is a member of the org that owns this website
  const membership = await db.collection("memberships").findOne({
    userId: new ObjectId(userId),
    organizationId: website.organizationId,
  });

  if (!membership) return null;

  return website;
}

async function getFormData(websiteId, formIdentifier) {
  const { db } = await connectToDatabase();

  // The formIdentifier can be either the form's `id` or its `name`.
  const query = {
    websiteId: new ObjectId(websiteId),
    $or: [
      { formId: formIdentifier },
      { formName: decodeURIComponent(formIdentifier) },
    ],
  };

  const submissions = await db
    .collection("submissions")
    .find(query)
    .limit(100)
    .sort({ submittedAt: -1 })
    .toArray();

  // From all submissions, find all unique field names from formData
  const allKeys = new Set();
  submissions.forEach((s) => {
    Object.keys(s.formData).forEach((key) => allKeys.add(key));
  });

  // Also fetch existing mappings
  const formMapping = await db.collection("mappings").findOne({
    websiteId: new ObjectId(websiteId),
    formIdentifier: formIdentifier,
  });

  return {
    detectedFields: Array.from(allKeys),
    initialMappings: formMapping?.mappings || {},
  };
}

export default async function FieldMappingPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { websiteId, formId: formIdentifier } = params;

  const website = await getWebsiteDetails(websiteId, session.user.id);
  if (!website) {
    return (
      <div className="p-8">
        <h2>Error</h2>
        <p>Website not found or you don't have permission to access it.</p>
      </div>
    );
  }

  const { detectedFields, initialMappings } = await getFormData(
    websiteId,
    formIdentifier
  );

  // Standard fields that users can map to.
  const standardLeadFields = [
    { id: "firstName", label: "First Name" },
    { id: "lastName", label: "Last Name" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone Number (with country code)" },
    { id: "company", label: "Company Name" },
    { id: "city", label: "City" },
    { id: "notes", label: "Notes / Message" },
    { id: "attachments", label: "Attachments" },
  ];

  const formName = decodeURIComponent(formIdentifier);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
      value={{ isOpen: true }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">
                      {website.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Mapping</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 className="text-2xl font-bold">Field Mapping</h1>
              <p className="text-muted-foreground">
                Map fields from your form{" "}
                <span className="font-semibold text-primary">{formName}</span>{" "}
                to standard Lead properties.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Website: {website.name}
              </p>
            </div>

            <FieldMappingClient
              websiteId={websiteId}
              formIdentifier={formIdentifier}
              detectedFields={detectedFields}
              standardLeadFields={standardLeadFields}
              initialMappings={initialMappings}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
