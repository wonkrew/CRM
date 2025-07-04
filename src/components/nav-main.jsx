"use client"

import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PermissionElement } from "@/hooks/use-permission";
import { RESOURCES, ACTIONS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function NavMain({ items }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {/* If items prop is provided, render only those items */}
          {items && items.length > 0 ? (
            items.map((item) => {
              // Determine if this item is active
              const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
              return (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.url}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      {item.icon && <item.icon className="mr-2" />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })
          ) : (
            <>
              {/* Default navigation items */}
              <SidebarMenuItem>
                <Link href="/dashboard">
                  <SidebarMenuButton tooltip="Overview">
                    <span>Overview</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/dashboard/websites">
                  <SidebarMenuButton tooltip="Websites">
                    <span>Websites</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/dashboard/leads">
                  <SidebarMenuButton tooltip="Leads">
                    <span>Leads</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {/* Permission-based navigation items */}
              <PermissionElement resource={RESOURCES.MEMBERS} action={ACTIONS.VIEW}>
                <SidebarMenuItem>
                  <Link href="/dashboard/members">
                    <SidebarMenuButton tooltip="Members">
                      <span>Members</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </PermissionElement>
              <PermissionElement resource={RESOURCES.ROLES} action={ACTIONS.VIEW}>
                <SidebarMenuItem>
                  <Link href="/dashboard/roles">
                    <SidebarMenuButton tooltip="Roles">
                      <span>Roles</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </PermissionElement>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
