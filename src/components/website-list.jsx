"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WebsiteList({ websites, onWebsiteClick }) {
  const [copiedId, setCopiedId] = useState(null);
  const [showInstructions, setShowInstructions] = useState(null);

  const handleCopy = (e, websiteId) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    const scriptTag = `<script src="${window.location.origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`;
    navigator.clipboard.writeText(scriptTag);
    setCopiedId(websiteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWebsiteClick = (e, websiteId) => {
    if (onWebsiteClick) {
      e.preventDefault();
      onWebsiteClick(websiteId);
    }
  };

  if (websites.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium">No websites yet!</h3>
        <p className="text-muted-foreground mt-1">Click "Add Website" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {websites.map((w) => (
        <Link
          href={`/dashboard/websites/${w._id}/forms`}
          key={w._id}
          className="block border rounded-lg p-4 cursor-pointer transition-all hover:bg-muted/50"
          onClick={(e) => handleWebsiteClick(e, w._id)}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{w.name}</h3>
              <p className="text-xs text-muted-foreground bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full inline-block mt-2">
                {w.url}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault(); // Prevent link navigation
                  e.stopPropagation();
                  setShowInstructions(showInstructions === w._id ? null : w._id);
                }}
              >
                Setup Instructions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleCopy(e, w._id)}
                className="flex gap-2 items-center"
              >
                {copiedId === w._id ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                Copy Script
              </Button>
            </div>
          </div>

          {showInstructions === w._id && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-sm">
              <h4 className="font-semibold mb-2">How to track forms:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Paste this script tag into the `{`<head>`}` of your website's HTML.
                  <pre className="text-xs bg-gray-900 text-white p-2 rounded-md mt-1 overflow-x-auto">
                    {`<script src="${window.location.origin}/tracker.js" data-website-id="${w._id}" async defer></script>`}
                  </pre>
                </li>
                <li>
                  The script will automatically detect and track submissions from all forms on your site.
                </li>
                <li>
                  You can then configure field mappings for each discovered form from the dashboard.
                </li>
              </ol>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
