"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconLogout,
  IconLoader2,
  IconPlus,
  IconCirclePlusFilled,
  IconMail,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
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

  // Data for the sidebar navigation
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Websites",
      url: "/dashboard/websites",
      icon: IconFolder,
    },
    {
      title: "Leads",
      url: "/dashboard/leads",
      icon: IconDatabase,
    },
    {
      title: "Members",
      url: "/dashboard/members",
      icon: IconUsers,
    },
  ];

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings", // Future page
      icon: IconSettings,
    },
  ];

  const user = session?.user
    ? {
        name: session.user.name || "User",
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  if (status === "loading") {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <div className="flex-1 flex items-center justify-center">
          <IconLoader2 className="animate-spin" />
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
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">FormTrack</span>
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
          <Button
            size="icon"
            className="size-8 group-data-[collapsible=icon]:opacity-0"
            variant="outline"
          >
            <IconMail />
            <span className="sr-only">Inbox</span>
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarContent>
        <NavMain items={navMain} />
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
