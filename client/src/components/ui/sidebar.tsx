import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  CheckSquare, 
  Users, 
  BarChart3, 
  Briefcase, 
  Settings,
  Building,
  Calendar,
  FileText,
  X
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function Sidebar({ isOpen = true, onClose, className }: SidebarProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const navigation = [
    {
      name: "الرئيسية",
      href: "/",
      icon: Home,
      badge: null,
    },
    {
      name: "المهام",
      href: "/tasks",
      icon: CheckSquare,
      badge: "8",
    },
    {
      name: "التقارير",
      href: "/reports",
      icon: BarChart3,
      badge: null,
    },
    {
      name: "الملف الشخصي",
      href: `/profile/${user?.id}`,
      icon: Users,
      badge: null,
    },
  ];

  const adminNavigation = [
    {
      name: "لوحة المدير",
      href: "/admin",
      icon: Building,
      badge: null,
    },
    {
      name: "الموارد البشرية",
      href: "/hr",
      icon: Briefcase,
      badge: "3",
    },
  ];

  const quickActions = [
    {
      name: "مهمة جديدة",
      action: () => {},
      icon: CheckSquare,
    },
    {
      name: "تقرير سريع",
      action: () => {},
      icon: FileText,
    },
    {
      name: "جدولة اجتماع",
      action: () => {},
      icon: Calendar,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const allNavigation = [
    ...navigation,
    ...(user?.role === 'admin' || user?.role === 'sub-admin' ? adminNavigation : []),
  ];

  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-card border-l border-border",
      className
    )}>
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">القائمة الرئيسية</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="sidebar-close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-3">
          {allNavigation.map((item) => (
            <Button
              key={item.name}
              variant={isActive(item.href) ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => {
                setLocation(item.href);
                onClose?.();
              }}
              data-testid={`sidebar-nav-${item.href.replace('/', '') || 'home'}`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-right">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </nav>

        <Separator className="my-4 mx-3" />

        {/* Quick Actions */}
        <div className="px-3">
          <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            إجراءات سريعة
          </h3>
          <nav className="space-y-1">
            {quickActions.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3"
                onClick={() => {
                  item.action();
                  onClose?.();
                }}
                data-testid={`sidebar-quick-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">متصل كـ</p>
            <p className="text-sm font-medium text-foreground truncate">
              {user?.fullName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
