import { Home, LogOut, Target } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteLogo } from "@/components/SiteLogo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppSidebarLayoutProps = {
  children: React.ReactNode;
};

const navItems = [
  {
    label: "Inicio",
    to: "/",
    icon: Home,
    isActive: (pathname: string) => pathname === "/" || pathname.startsWith("/materia/"),
  },
  {
    label: "Modo Prova",
    to: "/prova",
    icon: Target,
    isActive: (pathname: string) => pathname.startsWith("/prova"),
  },
];

export function AppSidebarLayout({ children }: AppSidebarLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="offcanvas" className="border-r border-border">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-2 px-2">
            <SiteLogo className="h-8 w-8" />
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Caderno de Estudos</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={item.isActive(pathname)} tooltip={item.label}>
                  <NavLink to={item.to}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <ThemeToggle />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
