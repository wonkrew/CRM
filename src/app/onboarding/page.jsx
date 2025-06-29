"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    if (!orgName) {
      setError("Organization name is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
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