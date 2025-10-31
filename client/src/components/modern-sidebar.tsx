import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CheckSquare,
  Users,
  Building,
  MessageSquare,
  UserCog,
  FileText,
  Lightbulb,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModernSidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation = [
    { name: "لوحة التحكم", href: "/", icon: LayoutDashboard, gradient: "from-blue-500 to-cyan-500" },
    { name: "المهام", href: "/tasks", icon: CheckSquare, gradient: "from-purple-500 to-pink-500" },
    { name: "المحادثات", href: "/chat", icon: MessageSquare, gradient: "from-green-500 to-emerald-500" },
    { name: "الشركات", href: "/companies", icon: Building, gradient: "from-orange-500 to-red-500" },
    { name: "المقترحات", href: "/suggestions", icon: Lightbulb, gradient: "from-yellow-500 to-amber-500" },
  ];

  // Admin-only links
  const adminNavigation = [
    { name: "إدارة الموارد البشرية", href: "/hr-management", icon: UserCog, gradient: "from-indigo-500 to-purple-500" },
    { name: "طلبات الموظفين", href: "/employee-requests", icon: FileText, gradient: "from-pink-500 to-rose-500" },
  ];

  // Employee-only links
  const employeeNavigation = [
    { name: "طلباتي", href: "/my-requests", icon: FileText, gradient: "from-teal-500 to-cyan-500" },
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'sub-admin';
  const additionalNav = isAdmin ? adminNavigation : employeeNavigation;

  const allNavigation = [...navigation, ...additionalNav];

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <>
      {/* Modern Glassmorphism Sidebar */}
      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className={cn(
          "fixed right-0 top-20 bottom-4 z-40 transition-all duration-300",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className="h-full mx-4 glass-dark rounded-2xl shadow-glow backdrop-blur-2xl border border-white/10 overflow-hidden flex flex-col">
          {/* Toggle Button */}
          <div className="p-4 border-b border-white/10">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full glass hover:bg-white/10 rounded-xl"
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </motion.div>
              </Button>
            </motion.div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <AnimatePresence mode="wait">
              {allNavigation.map((item, index) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => setLocation(item.href)}
                      className={cn(
                        "w-full justify-start gap-3 relative overflow-hidden transition-all duration-300 rounded-xl h-12",
                        active
                          ? "glass-dark shadow-glow"
                          : "hover:bg-white/5"
                      )}
                    >
                      {/* Gradient Background on Active */}
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          className={cn(
                            "absolute inset-0 bg-gradient-to-r opacity-10",
                            item.gradient
                          )}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}

                      {/* Icon with Gradient */}
                      <div className="relative">
                        {active && (
                          <motion.div
                            className={cn(
                              "absolute inset-0 blur-lg bg-gradient-to-r",
                              item.gradient
                            )}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        <div className={cn(
                          "relative p-2 rounded-lg transition-all",
                          active ? `bg-gradient-to-r ${item.gradient}` : "bg-white/5"
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* Text */}
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className={cn(
                            "font-medium text-sm whitespace-nowrap",
                            active ? "text-white" : "text-gray-300"
                          )}
                        >
                          {item.name}
                        </motion.span>
                      )}

                      {/* Active Indicator */}
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white/0 via-white to-white/0 rounded-full"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>

          {/* User Info Card */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 border-t border-white/10"
            >
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 bg-gradient-primary rounded-full blur-md"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {user?.fullName[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{user?.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.department}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Assistant Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setLocation('/ai-models')}
                className={cn(
                  "w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 hover:from-purple-600 hover:via-pink-600 hover:to-indigo-600 text-white border-0 shadow-glow-hover rounded-xl h-12",
                  isCollapsed && "px-0"
                )}
              >
                <Sparkles className="w-5 h-5" />
                {!isCollapsed && <span className="mr-2 font-semibold">مساعد AI</span>}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.aside>

      {/* Content Spacer */}
      <div className={cn(
        "transition-all duration-300",
        isCollapsed ? "mr-24" : "mr-80"
      )} />
    </>
  );
}
