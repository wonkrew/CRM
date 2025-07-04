"use client";

import { useState, useEffect } from "react";
import { checkPermission } from "@/lib/permissions";

export function usePermission(resource, action, resourceId = null) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const allowed = await checkPermission(resource, action, resourceId);
        if (mounted) {
          setHasPermission(allowed);
        }
      } catch (error) {
        console.error("Failed to check permission:", error);
        if (mounted) {
          setHasPermission(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [resource, action, resourceId]);

  return { hasPermission, loading };
}

// Higher-order component for permission-based rendering
export function withPermission(WrappedComponent, resource, action, resourceId = null) {
  return function PermissionWrapper(props) {
    const { hasPermission, loading } = usePermission(resource, action, resourceId);

    if (loading) {
      return null; // Or a loading indicator
    }

    if (!hasPermission) {
      return null; // Or a custom unauthorized component
    }

    return <WrappedComponent {...props} />;
  };
}

// Permission-based button component
export function PermissionButton({ resource, action, resourceId, children, ...props }) {
  const { hasPermission, loading } = usePermission(resource, action, resourceId);

  if (loading || !hasPermission) {
    return null;
  }

  return <button {...props}>{children}</button>;
}

// Permission-based element component
export function PermissionElement({ resource, action, resourceId, children, fallback = null }) {
  const { hasPermission, loading } = usePermission(resource, action, resourceId);

  if (loading) {
    return null; // Or a loading indicator
  }

  return hasPermission ? children : fallback;
} 