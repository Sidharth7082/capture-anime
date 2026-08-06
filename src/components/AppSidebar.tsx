
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Home, ImagePlus } from "lucide-react";

const items = [
  {
    title: "Discover",
    url: "#top",
    icon: Home,
  },
  {
    title: "Waifu GIFs",
    url: "#gif",
    icon: ImagePlus,
  },
];

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs text-muted-foreground tracking-widest px-4 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 hover:text-white transition group"
                    >
                      <item.icon
                        className="w-5 h-5 text-zinc-400 group-hover:text-[#e50914] transition"
                      />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
