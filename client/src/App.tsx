import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { ProtectedRoute } from "@/lib/protected-route";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import TaskManagement from "@/pages/task-management";
import UserProfile from "@/pages/user-profile";
import Reports from "@/pages/reports";
import HRManagement from "@/pages/hr-management";
import UserManagement from "@/pages/user-management";
import Chat from "@/pages/chat";
import MyRequests from "@/pages/my-requests";
import Companies from "@/pages/companies";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/tasks" component={TaskManagement} />
      <ProtectedRoute path="/companies" component={Companies} />
      <ProtectedRoute path="/profile/:id?" component={UserProfile} />
      <ProtectedRoute path="/user-profile/:id?" component={UserProfile} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/hr" component={HRManagement} />
      <ProtectedRoute path="/user-management" component={UserManagement} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/my-requests" component={MyRequests} />
      <ProtectedRoute path="/settings" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <div className="min-h-screen bg-background rtl-grid">
            <Router />
            <Toaster />
          </div>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
