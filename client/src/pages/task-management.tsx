
import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import TaskKanban from "@/components/task-kanban";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task, User } from "@shared/schema";

export default function TaskManagement() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
 
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    dueDate: "",
    companyName: "", // الحقل الجديد
  });
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all"); // فلتر الموظف
  const [departmentFilter, setDepartmentFilter] = useState("all"); // فلتر القسم

  // Fetch tasks (للـ admin: كل المهام، لغير admin: مهامي ومعينة لي)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: user?.role === 'admin' || user?.role === 'sub-admin',
  });
  const { data: myTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
    enabled: user?.role !== 'admin' && user?.role !== 'sub-admin',
  });
  const { data: assignedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
    enabled: user?.role !== 'admin' && user?.role !== 'sub-admin',
  });
  // Fetch users for assignment and filtering
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: "",
        dueDate: "",
        companyName: "", // إعادة تعيين الحقل الجديد
      });
      toast({
        title: "تم إنشاء المهمة بنجاح",
        description: "تمت إضافة المهمة الجديدة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء المهمة",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...newTask,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      assignedTo: newTask.assignedTo || undefined,
      companyName: newTask.companyName || undefined, // الحقل الجديد
    });
  };
  // Filter tasks
  const filteredTasks = (user?.role === 'admin' || user?.role === 'sub-admin' ? tasks : [...myTasks, ...assignedTasks]).filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    // Status filter
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    // Priority filter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    // User filter
    const matchesUser = userFilter === "all" ||
                        (userFilter === "my" && (task.createdBy === user?.id || task.assignedTo === user?.id)) ||
                        task.createdBy === userFilter ||
                        task.assignedTo === userFilter;
    // Department filter
    const matchesDepartment = departmentFilter === "all" ||
                              (users.find(u => u.id === task.createdBy || u.id === task.assignedTo)?.department === departmentFilter);
    return matchesSearch && matchesStatus && matchesPriority && matchesUser && matchesDepartment;
  });
  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const underReviewTasks = filteredTasks.filter(task => task.status === 'under_review');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setUserFilter("all");
    setDepartmentFilter("all");
    toast({
      title: "تم إعادة تعيين الفلاتر",
      description: "تم مسح جميع الفلاتر",
    });
  };
  // Get unique departments
  const departments = Array.from(new Set(users.map(user => user.department))).filter(dep => dep);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
    
      <div className="flex">
        <Sidebar />
      
        <main className={cn("flex-1 p-6 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                إدارة المهام
              </h1>
              <p className="text-muted-foreground">
                {user?.role === 'admin' || user?.role === 'sub-admin'
                  ? "تنظيم وتتبع جميع المهام لكل الموظفين"
                  : "تنظيم وتتبع جميع المهام الشخصية والجماعية"}
              </p>
            </div>
          
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" data-testid="button-create-task">
                  <Plus className="w-4 h-4" />
                  إنشاء مهمة جديدة
                </Button>
              </DialogTrigger>
            
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-task">
                <DialogHeader>
                  <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
                </DialogHeader>
              
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">عنوان المهمة *</Label>
                    <Input
                      id="task-title"
                      placeholder="أدخل عنوان المهمة"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      required
                      data-testid="input-task-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">الوصف</Label>
                    <Textarea
                      id="task-description"
                      placeholder="وصف تفصيلي للمهمة..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      data-testid="input-task-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-company">اسم الشركة</Label>
                    <Input
                      id="task-company"
                      placeholder="أدخل اسم الشركة (اختياري)"
                      value={newTask.companyName}
                      onChange={(e) => setNewTask({ ...newTask, companyName: e.target.value })}
                      data-testid="input-task-company"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-priority">الأولوية</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                      >
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفض</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="high">عالي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-due-date">موعد الاستحقاق</Label>
                      <Input
                        id="task-due-date"
                        type="datetime-local"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        data-testid="input-task-due-date"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-assignee">تعيين لـ</Label>
                    <Select
                      value={newTask.assignedTo}
                      onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
                    >
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="اختر موظف (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} - {user.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending}
                      data-testid="button-submit-task"
                    >
                      {createTaskMutation.isPending ? "جاري الإنشاء..." : "إنشاء المهمة"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-task"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {/* Filters */}
          <Card className="mb-6" data-testid="card-task-filters">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في المهام..."
                      className="pr-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-tasks"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-priority">
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأولويات</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="low">منخفض</SelectItem>
                  </SelectContent>
                </Select>
                {(user?.role === 'admin' || user?.role === 'sub-admin') && (
                  <>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-[200px]" data-testid="select-filter-user">
                        <SelectValue placeholder="الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الموظفين</SelectItem>
                        <SelectItem value="my">مهامي</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} - {user.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-filter-department">
                        <SelectValue placeholder="القسم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأقسام</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleResetFilters} data-testid="button-reset-filters">
                  <Filter className="w-4 h-4 ml-2" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Task Stats */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <Card data-testid="card-pending-tasks-count">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">قيد الانتظار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{pendingTasks.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-progress-tasks-count">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">قيد التنفيذ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{inProgressTasks.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-completed-tasks-count">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">مكتمل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{completedTasks.length}</div>
              </CardContent>
            </Card>
          </div>
          {/* Kanban Board */}
          <TaskKanban
            pendingTasks={pendingTasks}
            inProgressTasks={inProgressTasks}
            underReviewTasks={underReviewTasks}
            completedTasks={completedTasks}
          />
        </main>
      </div>
    </div>
  );
}
