"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!orgName?.trim()) {
      setError("Organization name is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      console.log("Creating organization...");
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          name: orgName.trim() 
        }),
        credentials: 'include'
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      // First try to get the raw text
      const rawText = await res.text();
      console.log("Raw response:", rawText);

      let data;
      try {
        // Then try to parse it as JSON
        data = JSON.parse(rawText);
        console.log("Parsed response data:", data);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Server returned invalid JSON. Raw response: ${rawText.substring(0, 100)}...`);
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.details || "Failed to create organization");
      }

      toast.success("Organization created successfully!");
      
      // Wait a moment for the session to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Hard redirect to ensure session is refreshed
      window.location.href = "/dashboard";
      
    } catch (err) {
      console.error("Organization creation error:", err);
      const errorMessage = err.message || "Failed to create organization";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-800 shadow-md rounded-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to FormTrack!</h1>
          <p className="text-muted-foreground mt-2">
            Let's start by creating your organization.
          </p>
        </div>
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="e.g., Acme Inc."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
} 