import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Images,
  Wand2
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "교사 인증 관리",
    url: "/admin/teachers",
    icon: Shield,
    group: "management"
  },
  {
    title: "교과서 관리",
    url: "/admin/textbooks",
    icon: BookOpen,
    group: "management"
  },
  {
    title: "수업자료 관리",
    url: "/admin/materials",
    icon: FileText,
    group: "management"
  },
  {
    title: "수업자료 관리 V2",
    url: "/admin/materials-v2",
    icon: Wand2,
    group: "management"
  },
  {
    title: "이미지 DB 관리",
    url: "/admin/images",
    icon: Images,
    group: "management"
  },
  {
    title: "사용자 관리",
    url: "/admin/users",
    icon: Users,
    group: "management"
  }
];

const groups = {
  management: "관리",
  system: "시스템"
};

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (isActive: boolean) =>
    isActive 
      ? "bg-mango-green-light text-mango-green font-medium border-l-4 border-mango-green" 
      : "hover:bg-mango-green-soft text-muted-foreground hover:text-foreground transition-all duration-200";

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-border bg-card/30 backdrop-blur-sm`}>
      <SidebarContent className="p-4">
        {Object.entries(groupedItems).map(([groupKey, items]) => (
          <SidebarGroup key={groupKey} className="mb-6">
            {!collapsed && (
              <SidebarGroupLabel className="text-muted-foreground font-semibold mb-3 px-2">
                {groups[groupKey as keyof typeof groups]}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title} className="mb-1">
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 ${getNavClass(isActive(item.url))}`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}