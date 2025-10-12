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
import { Plus, Search, Filter, ListTodo, Zap, CheckCircle2, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task, User } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

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
    companyName: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

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
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

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
        companyName: "",
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
      companyName: newTask.companyName || undefined,
    });
  };

  const filteredTasks = (user?.role === 'admin' || user?.role === 'sub-admin' ? tasks : [...myTasks, ...assignedTasks]).filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesUser = userFilter === "all" ||
                        (userFilter === "my" && (task.createdBy === user?.id || task.assignedTo === user?.id)) ||
                        task.createdBy === userFilter ||
                        task.assignedTo === userFilter;
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

  const departments = Array.from(new Set(users.map(user => user.department))).filter(dep => dep);

  const statsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
    
      <div className="flex">
        <Sidebar />
      
        <main className={cn("flex-1 p-6 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                إدارة المهام
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                {user?.role === 'admin' || user?.role === 'sub-admin'
                  ? "تنظيم وتتبع جميع المهام لكل الموظفين"
                  : "تنظيم وتتبع جميع المهام الشخصية والجماعية"}
              </p>
            </div>
          
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="flex items-center gap-2 shadow-lg hover:shadow-primary/50 transition-all" data-testid="button-create-task">
                    <Plus className="w-5 h-5" />
                    إنشاء مهمة جديدة
                  </Button>
                </motion.div>
              </DialogTrigger>
            
              <DialogContent className="sm:max-w-[550px]" data-testid="dialog-create-task">
                <DialogHeader>
                  <DialogTitle className="text-2xl">إنشاء مهمة جديدة</DialogTitle>
                </DialogHeader>
              
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title" className="text-base font-medium">عنوان المهمة *</Label>
                    <Input
                      id="task-title"
                      placeholder="أدخل عنوان المهمة"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      required
                      data-testid="input-task-title"
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description" className="text-base font-medium">الوصف</Label>
                    <Textarea
                      id="task-description"
                      placeholder="وصف تفصيلي للمهمة..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={4}
                      data-testid="input-task-description"
                      className="text-base resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-company" className="text-base font-medium">اسم الشركة</Label>
                    <Input
                      id="task-company"
                      placeholder="أدخل اسم الشركة (اختياري)"
                      value={newTask.companyName}
                      onChange={(e) => setNewTask({ ...newTask, companyName: e.target.value })}
                      data-testid="input-task-company"
                      className="text-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-priority" className="text-base font-medium">الأولوية</Label>
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
                      <Label htmlFor="task-due-date" className="text-base font-medium">موعد الاستحقاق</Label>
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
                    <Label htmlFor="task-assignee" className="text-base font-medium">تعيين لـ</Label>
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
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending}
                      data-testid="button-submit-task"
                      className="flex-1"
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6 shadow-lg border-primary/10" data-testid="card-task-filters">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary" />
                      <Input
                        placeholder="البحث في المهام..."
                        className="pr-12 h-11 text-base border-primary/20 focus:border-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-tasks"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] h-11" data-testid="select-filter-status">
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
                    <SelectTrigger className="w-[160px] h-11" data-testid="select-filter-priority">
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
                        <SelectTrigger className="w-[200px] h-11" data-testid="select-filter-user">
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
                        <SelectTrigger className="w-[160px] h-11" data-testid="select-filter-department">
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
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-11" data-testid="button-reset-filters">
                      <Filter className="w-4 h-4 ml-2" />
                      إعادة تعيين
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={statsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="card-pending-tasks-count">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    قيد الانتظار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="text-3xl font-bold text-yellow-600 dark:text-yellow-500"
                  >
                    {pendingTasks.length}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">مهمة في الانتظار</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={statsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="card-progress-tasks-count">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    قيد التنفيذ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                    className="text-3xl font-bold text-blue-600 dark:text-blue-500"
                  >
                    {inProgressTasks.length}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">مهمة قيد التنفيذ</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={statsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="card-review-tasks-count">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    تحت المراجعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    className="text-3xl font-bold text-purple-600 dark:text-purple-500"
                  >
                    {underReviewTasks.length}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">مهمة تحت المراجعة</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={statsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="card-completed-tasks-count">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    مكتمل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                    className="text-3xl font-bold text-green-600 dark:text-green-500"
                  >
                    {completedTasks.length}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">مهمة مكتملة</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <TaskKanban
              pendingTasks={pendingTasks}
              inProgressTasks={inProgressTasks}
              underReviewTasks={underReviewTasks}
              completedTasks={completedTasks}
            />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
