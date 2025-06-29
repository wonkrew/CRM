import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import LeadsClient from "./leads-client"; // Import the new client component
import { Suspense } from "react";

// This function will now handle server-side pagination, sorting, and filtering
async function getLeadsData(organizationId, userId, { page, pageSize, q, sortBy, sortOrder }) {
  const { db } = await connectToDatabase();

  const membership = await db.collection("memberships").findOne({
    userId: new ObjectId(userId),
    organizationId: new ObjectId(organizationId),
  });
  if (!membership) throw new Error("Forbidden");

  const websites = await db.collection("websites").find({ organizationId: new ObjectId(organizationId) }).project({ _id: 1 }).toArray();
  const websiteIds = websites.map(w => w._id);

  // Define the base match stage for the aggregation pipeline
  const matchStage = { websiteId: { $in: websiteIds } };
  
  // If there's a search query, add it to the match stage
  if (q) {
    // This is a simple text search. For production, you might want a more robust text index.
    matchStage.$or = [
      { "formData.name": { $regex: q, $options: "i" } },
      { "formData.email": { $regex: q, $options: "i" } },
      { "status": { $regex: q, $options: "i" } },
    ];
  }
  
  const sortStage = {};
  if (sortBy) {
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
  } else {
    sortStage.submittedAt = -1; // Default sort
  }

  const facetStage = {
    metadata: [{ $count: "total" }],
    data: [
      { $sort: sortStage },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ],
  };

  const aggregation = [
    { $match: matchStage },
    { $facet: facetStage },
  ];

  const result = await db.collection("submissions").aggregate(aggregation).toArray();
  const rawLeads = result[0].data;
  const totalLeads = result[0].metadata[0]?.total || 0;
  const pageCount = Math.ceil(totalLeads / pageSize);

  // We still need to fetch all mappings and website names to enrich the data
  const [allWebsites, allMappings] = await Promise.all([
     db.collection("websites").find({ organizationId: new ObjectId(organizationId) }).toArray(),
     db.collection("mappings").find({ websiteId: { $in: websiteIds } }).toArray()
  ]);

  const websiteMap = Object.fromEntries(allWebsites.map(w => [w._id.toString(), w.name]));
  const mappingsMap = Object.fromEntries(allMappings.map(m => [`${m.websiteId}-${m.formIdentifier}`, m.mappings]));
  const allStandardFields = Array.from(new Set(allMappings.flatMap(m => Object.values(m.mappings))));

  // Transform the paginated leads
  const leads = rawLeads.map((sub) => {
    const mappingKey = `${sub.websiteId}-${sub.formId || sub.formName}`;
    const activeMapping = mappingsMap[mappingKey] || {};
    const invertedMapping = Object.fromEntries(Object.entries(activeMapping).map(([k, v]) => [v, k]));
    const mappedData = {};
    allStandardFields.forEach((field) => {
      const sourceField = invertedMapping[field];
      mappedData[field] = sourceField ? sub.formData[sourceField] : "N/A";
    });

    return {
      id: sub._id.toString(),
      status: sub.status || "New",
      projectValue: sub.projectValue || 0,
      source: `${websiteMap[sub.websiteId.toString()] || "Unknown"} / ${sub.formName || sub.formId || "Untitled"}`,
      submittedAt: sub.submittedAt.toISOString(),
      ...mappedData,
      rawData: sub.formData,
    };
  });
  
  return { leads, pageCount, standardFields: allStandardFields };
}

export default async function LeadsPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.memberships?.length) {
    redirect("/login");
  }

  const activeOrganizationId = session.user.memberships[0].organizationId;

  // Parse search params for server-side operations
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : 10;
  const q = searchParams.q || "";
  const sortBy = searchParams.sortBy || "submittedAt";
  const sortOrder = searchParams.sortOrder || "desc";

  const { leads, pageCount, standardFields } = await getLeadsData(
    activeOrganizationId,
    session.user.id,
    { page, pageSize, q, sortBy, sortOrder }
  );

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
          {/* LeadsClient uses useSearchParams which requires a suspense boundary */}
          <Suspense fallback={null}>
            <LeadsClient 
              leads={leads} 
              standardFields={standardFields}
              pageCount={pageCount}
              initialState={{ page, pageSize, q, sortBy, sortOrder }}
            />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
 