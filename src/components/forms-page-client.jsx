"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toDisplayString } from "@/lib/utils";

export default function FormsPageClient({ websiteId, forms }) {
    const router = useRouter();

    const handleMapFields = (form) => {
        const formIdentifier = form.formId || encodeURIComponent(form.formName) || 'untitled';
        router.push(`/dashboard/websites/${websiteId}/forms/${formIdentifier}/mapping`);
    };

    if (forms.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">No forms discovered yet.</h3>
                <p className="text-muted-foreground mt-1">Once your website starts receiving submissions, forms will appear here.</p>
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