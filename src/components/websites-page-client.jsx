"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateWebsiteDialog } from "./create-website-dialog";
import { WebsiteList } from "./website-list"; // Correctly import the reusable component

export default function WebsitesPageClient({ initialWebsites, session }) {
  const [websites, setWebsites] = useState(initialWebsites);
  const [isCreating, setIsCreating] = useState(false);

  const activeOrganizationId = session.user.memberships?.[0]?.organizationId;
  
  const refetchWebsites = async () => {
    if(!activeOrganizationId) return;
    const res = await fetch(`/api/websites?organizationId=${activeOrganizationId}`);
    if(res.ok) {
      const data = await res.json();
      setWebsites(data);
    }
  };

  // This page doesn't need to handle selection, so we pass a dummy function.
  const handleSelectWebsite = () => {};

  return (
    <div className="flex flex-col gap-6">
       <CreateWebsiteDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onWebsiteCreated={refetchWebsites}
        organizationId={activeOrganizationId}
      />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Websites</h2>
        <Button onClick={() => setIsCreating(true)} disabled={!activeOrganizationId}>
            <Plus className="size-4 mr-2" />
            Add Website
        </Button>
      </div>
      
      <WebsiteList 
        websites={websites} 
        selectedWebsiteId={null} // No selection concept on this page
        onSelectWebsite={handleSelectWebsite}
      />
    </div>
  );
} 