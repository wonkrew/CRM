"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWebsiteDialog({ open, onOpenChange, onWebsiteCreated, organizationId }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name) {
      setError("Website name is required.");
      return;
    }
    if (!url || !url.startsWith('http')) {
      setError("A valid website URL (starting with http or https) is required.");
      return;
    }
    if (!organizationId) {
      setError("Organization ID is missing.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, organizationId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403) {
          throw new Error("You don't have permission to create websites. Please contact your administrator.");
        }
        throw new Error(errorData.error || "Failed to create website");
      }
      setName("");
      setUrl("");
      onWebsiteCreated(); // Callback to refresh the website list
      onOpenChange(false); // Close the dialog
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a new website</DialogTitle>
          <DialogDescription>
            Give your website a name. This is for internal tracking and can be changed later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 'My Marketing Website'"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">
              URL
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com"
            />
          </div>
          {error && <p className="col-span-4 text-red-500 text-sm text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Adding..." : "Add Website"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 