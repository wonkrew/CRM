"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  IconLoader2,
  IconLogout,
  IconCirclePlusFilled,
  IconMail,
  IconSettings,
  IconHome,
  IconWorld,
  IconUsers,
  IconUser,
  IconListCheck,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data for the secondary navigation (settings, etc)
  const navSecondary = [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
  ];

  // Data for the main navigation with icons
  const navMain = [
    { title: "Overview", url: "/dashboard", icon: IconHome },
    { title: "Websites", url: "/dashboard/websites", icon: IconWorld },
    { title: "Leads", url: "/dashboard/leads", icon: IconListCheck },
    { title: "Members", url: "/dashboard/members", icon: IconUsers },
    { title: "Roles", url: "/dashboard/roles", icon: IconUser },
  ];

  const user = session?.user
    ? {
        name: session.user.name || "User",
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  if (status === "loading") {
    // Show a sidebar-like skeleton loader while loading session
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <div className="flex-1 flex flex-col gap-3 p-4 justify-center">
          {/* Logo skeleton */}
          <Skeleton className="w-full h-8 mb-4" />
          {/* Sidebar item skeletons */}
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          {/* Footer/user skeleton */}
          <div className="mt-auto">
            <Skeleton className="w-full h-6" />
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard" className="flex items-center gap-2 select-none">
                <img src="/globe.svg" alt="Oruplace Logo" className="w-7 h-7" />
                <span
                  className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent tracking-tight"
                >
                  Oruplace
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-2">
          <SidebarMenuButton
            disabled
            tooltip="Quick Create (Disabled)"
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
          >
            <IconCirclePlusFilled />
            <span>Quick Create</span>
          </SidebarMenuButton>
          
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarContent>
        {/* Only one NavMain for main nav, with icons */}
        <NavMain items={navMain} />
        {/* Secondary nav (settings) */}
        <NavMain items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        {user && <NavUser user={user} />}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full"
            >
              <IconLogout className="size-4" />
              Sign Out
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Export memoized AppSidebar to prevent unnecessary re-renders
export const MemoAppSidebar = React.memo(AppSidebar);
