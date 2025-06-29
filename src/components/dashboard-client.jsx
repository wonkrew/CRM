"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Plus, Loader2 } from "lucide-react";
import { CreateWebsiteDialog } from "./create-website-dialog";
import { WebsiteList } from "./website-list";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function FormsList({ forms, isLoading, websiteId }) {
    const router = useRouter();

    const toDisplayString = (val) => {
      if (val == null) return "";
      if (typeof val === "object") {
        if (Array.isArray(val)) return val.length === 0 ? "[]" : JSON.stringify(val);
        if (Object.keys(val).length === 0) return ""; // empty object, treat as blank
        return JSON.stringify(val);
      }
      return String(val);
    };

    const handleMapFields = (form) => {
        const formIdentifier = form.formId || encodeURIComponent(form.formName) || 'untitled';
        router.push(`/dashboard/websites/${websiteId}/forms/${formIdentifier}/mapping`);
    };

    if (isLoading) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (forms.length === 0) {
        return (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">No forms discovered yet.</h3>
                <p className="text-muted-foreground mt-1 text-sm">Once your website starts receiving submissions, forms will appear here.</p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg">
            <div className="divide-y">
                {forms.map((form, index) => (
                    <div key={index} className="p-4 flex justify-between items-center">
                        <div>
                            <div className="font-semibold">{toDisplayString(form.formName) || toDisplayString(form.formId) || "Untitled Form"}</div>
                            <div className="text-xs text-muted-foreground">
                                {form.submissionCount} submissions | Last seen: {new Date(form.lastSubmitted).toLocaleDateString()}
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleMapFields(form)}>Map Fields</Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SubmissionsTable({ submissions, isLoading }) {
  // Debug log to see what submissions actually is
  console.log('submissions:', submissions);

  // Defensive: always use an array
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  // Helper to safely display any value
  const toDisplayString = (val) => {
    if (val == null) return "";
    if (typeof val === "object") {
      if (Array.isArray(val)) return val.length === 0 ? "[]" : JSON.stringify(val);
      if (Object.keys(val).length === 0) return ""; // empty object, treat as blank
      return JSON.stringify(val);
    }
    return String(val);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (safeSubmissions.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium">No submissions yet!</h3>
        <p className="text-muted-foreground mt-1">Once you add the script to your site, form submissions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="border-b px-4 py-3 text-left font-medium">Form</th>
            <th className="border-b px-4 py-3 text-left font-medium">Page</th>
            <th className="border-b px-4 py-3 text-left font-medium">Date/Time</th>
            <th className="border-b px-4 py-3 text-left font-medium">Form Data</th>
          </tr>
        </thead>
        <tbody>
          {safeSubmissions.map((s) => (
            <tr key={toDisplayString(s._id)} className="hover:bg-muted/50">
              <td className="border-b p-4 align-top">
                <div className="font-semibold">{toDisplayString(s.formName) || toDisplayString(s.formId) || "Untitled Form"}</div>
                {s.formId && <div className="text-xs text-muted-foreground">ID: {toDisplayString(s.formId)}</div>}
              </td>
              <td className="border-b p-4 max-w-xs truncate align-top">{toDisplayString(s.pageURL)}</td>
              <td className="border-b p-4 align-top">{toDisplayString(s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "")}</td>
              <td className="border-b p-4 align-top">
                <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                  {toDisplayString(s.formData)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardClient({ initialWebsites = [], initialSubmissions = [], session }) {
  const [websites, setWebsites] = useState(initialWebsites || []);
  const [submissions, setSubmissions] = useState(initialSubmissions || []);
  const [forms, setForms] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(initialWebsites[0]?._id);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const activeOrganizationId = session.user.memberships?.[0]?.organizationId;
  
  const refetchWebsites = async () => {
    if(!activeOrganizationId) return;
    const res = await fetch(`/api/websites?organizationId=${activeOrganizationId}`);
    if(res.ok) {
      const data = await res.json();
      setWebsites(data);
    }
  };

  const fetchForms = async (websiteId) => {
    setIsLoadingForms(true);
    try {
        const res = await fetch(`/api/forms?websiteId=${websiteId}`);
        if (res.ok) {
            const data = await res.json();
            setForms(data);
        } else {
            setForms([]);
        }
    } catch (error) {
        console.error("Failed to fetch forms", error);
        setForms([]);
    } finally {
        setIsLoadingForms(false);
    }
  };

  useEffect(() => {
    if (selectedWebsiteId) {
        fetchForms(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  const handleSelectWebsite = async (websiteId) => {
    if (selectedWebsiteId === websiteId) return;
    
    setSelectedWebsiteId(websiteId);
    setSubmissions([]); // Clear previous submissions
    setForms([]); // Clear previous forms
    
    // Fetch submissions
    setIsLoadingSubmissions(true);
    try {
        const res = await fetch(`/api/submissions?websiteId=${websiteId}`);
        if(res.ok) {
            const json = await res.json();
            console.log('API /api/submissions response:', json);
            // Try all possible array locations
            let arr = [];
            if (Array.isArray(json)) arr = json;
            else if (Array.isArray(json.data)) arr = json.data;
            else if (Array.isArray(json.submissions)) arr = json.submissions;
            setSubmissions(arr);
        } else {
            setSubmissions([]); // Clear submissions on error
        }
    } catch (error) {
        console.error("Failed to fetch submissions", error);
        setSubmissions([]);
    } finally {
        setIsLoadingSubmissions(false);
    }
    // The useEffect will trigger fetching for forms
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-1 flex flex-col gap-6">
        <CreateWebsiteDialog
            open={isCreating}
            onOpenChange={setIsCreating}
            onWebsiteCreated={refetchWebsites}
            organizationId={activeOrganizationId}
        />
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Your Websites</h2>
            <Button onClick={() => setIsCreating(true)} disabled={!activeOrganizationId}>
                <Plus className="size-4 mr-2" />
                Add Website
            </Button>
        </div>
        <WebsiteList websites={websites} onWebsiteClick={handleSelectWebsite} />
      </div>
      
      <div className="lg:col-span-2 flex flex-col gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Discovered Forms</h2>
          <FormsList forms={forms} isLoading={isLoadingForms} websiteId={selectedWebsiteId} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Submissions</h2>
          <SubmissionsTable submissions={submissions} isLoading={isLoadingSubmissions} />
        </div>
      </div>
    </div>
  );
}