import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Search, Filter, Calendar, User, Tag, Clock, MoreVertical,
  CheckCircle2, Circle, AlertCircle, Zap, Edit, Trash2, Eye
} from "lucide-react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, User as UserType } from "@shared/schema";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import Background3D from "@/components/3d-background";

// Task Card Component
function TaskCard({ task, users }: { task: Task; users: UserType[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = users.find(u => u.id === task.assignedTo);
  const creator = users.find(u => u.id === task.createdBy);

  const priorityConfig = {
    high: { color: "from-red-500 to-pink-500", icon: AlertCircle, text: "عالية" },
    medium: { color: "from-orange-500 to-yellow-500", icon: Clock, text: "متوسطة" },
    low: { color: "from-blue-500 to-cyan-500", icon: Circle, text: "منخفضة" },
  };

  const statusConfig = {
    pending: { color: "from-gray-400 to-gray-500", icon: Clock, text: "قيد الانتظار" },
    in_progress: { color: "from-blue-500 to-indigo-500", icon: Zap, text: "قيد التنفيذ" },
    under_review: { color: "from-purple-500 to-pink-500", icon: Eye, text: "تحت المراجعة" },
    completed: { color: "from-green-500 to-emerald-500", icon: CheckCircle2, text: "مكتمل" },
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className="group cursor-grab active:cursor-grabbing"
    >
      <div className="glass-dark rounded-xl p-4 border border-white/10 shadow-lg hover:shadow-glow-hover transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{task.title}</h3>
            {task.companyName && (
              <Badge className="bg-white/10 text-xs border-white/20 hover:bg-white/20">
                {task.companyName}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 glass hover:bg-white/10"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Priority & Due Date */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className={`bg-gradient-to-r ${priority.color} px-2 py-1 rounded-lg flex items-center gap-1`}>
            <PriorityIcon className="w-3 h-3 text-white" />
            <span className="text-xs font-medium text-white">{priority.text}</span>
          </div>
          {task.dueDate && (
            <div className="glass px-2 py-1 rounded-lg flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-300">
                {new Date(task.dueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {/* Assignee */}
          {assignee && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-white/20">
                <AvatarFallback className="text-xs bg-gradient-primary text-white">
                  {assignee.fullName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-300">{assignee.fullName}</span>
            </div>
          )}

          {/* Status Icon */}
          <div className={`bg-gradient-to-r ${status.color} p-1.5 rounded-lg`}>
            <StatusIcon className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Column Component
function TaskColumn({
  title,
  tasks,
  users,
  status,
  gradient
}: {
  title: string;
  tasks: Task[];
  users: UserType[];
  status: string;
  gradient: string;
}) {
  const { setNodeRef } = useSortable({ id: status });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 min-w-[320px]"
    >
      <div className="glass-dark rounded-2xl p-4 border border-white/10 shadow-xl h-full flex flex-col">
        {/* Column Header */}
        <div className="mb-4">
          <div className={`bg-gradient-to-r ${gradient} p-3 rounded-xl`}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">{title}</h2>
              <Badge className="bg-white/20 text-white border-none">
                {tasks.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <ScrollArea className="flex-1 -mx-2 px-2">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 pb-4">
              <AnimatePresence>
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} users={users} />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </ScrollArea>

        {/* Add Task Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            className="w-full mt-3 glass hover:bg-white/10 text-white border border-dashed border-white/20 rounded-xl"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مهمة
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Main Component
export default function ModernTaskBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
    companyName: "",
  });

  // Fetch data
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        assignedTo: "",
        companyName: "",
      });
      toast({
        title: "تم إنشاء المهمة",
        description: "تم إضافة المهمة بنجاح إلى اللوحة",
      });
    },
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Group tasks by status
  const tasksByStatus = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    under_review: filteredTasks.filter(t => t.status === 'under_review'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  };

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const task = tasks.find(t => t.id === active.id);
      if (task) {
        updateTaskMutation.mutate({ id: task.id, status: over.id });
      }
    }

    setActiveId(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...newTask,
      status: 'pending',
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
    });
  };

  return (
    <div className="min-h-screen relative">
      <Background3D />
      <ModernNavigation />
      <ModernSidebar />

      <main className="pt-6 pb-8 px-4 relative z-10">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Title */}
                <div>
                  <h1 className="text-3xl font-bold text-gradient mb-2">لوحة المهام</h1>
                  <p className="text-gray-400">إدارة وتتبع المهام بطريقة احترافية</p>
                </div>

                {/* Actions */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="bg-gradient-primary hover:opacity-90 shadow-glow rounded-xl">
                        <Plus className="w-5 h-5 ml-2" />
                        مهمة جديدة
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="glass-dark border-white/10 rounded-2xl sm:max-w-[500px]" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl text-gradient">إنشاء مهمة جديدة</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                      <div>
                        <Label className="text-white mb-2">عنوان المهمة</Label>
                        <Input
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="أدخل عنوان المهمة"
                          className="glass border-white/10 focus:border-primary/50 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2">الوصف</Label>
                        <Textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="وصف تفصيلي للمهمة"
                          className="glass border-white/10 focus:border-primary/50 text-white"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white mb-2">الأولوية</Label>
                          <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                            <SelectTrigger className="glass border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-dark border-white/10">
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="low">منخفضة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white mb-2">تاريخ الاستحقاق</Label>
                          <Input
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                            className="glass border-white/10 text-white"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white mb-2">تعيين إلى</Label>
                        <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}>
                          <SelectTrigger className="glass border-white/10 text-white">
                            <SelectValue placeholder="اختر موظف" />
                          </SelectTrigger>
                          <SelectContent className="glass-dark border-white/10">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                          إنشاء المهمة
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="glass border-white/10">
                          إلغاء
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-4">
                {/* Search */}
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث في المهام..."
                      className="pr-10 glass border-white/10 focus:border-primary/50 text-white"
                    />
                  </div>
                </div>

                {/* Priority Filter */}
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px] glass border-white/10 text-white">
                    <Filter className="w-4 h-4 ml-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    <SelectItem value="all">كل الأولويات</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => setActiveId(active.id as string)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              <TaskColumn
                title="قيد الانتظار"
                tasks={tasksByStatus.pending}
                users={users}
                status="pending"
                gradient="from-gray-400 to-gray-600"
              />
              <TaskColumn
                title="قيد التنفيذ"
                tasks={tasksByStatus.in_progress}
                users={users}
                status="in_progress"
                gradient="from-blue-500 to-indigo-600"
              />
              <TaskColumn
                title="تحت المراجعة"
                tasks={tasksByStatus.under_review}
                users={users}
                status="under_review"
                gradient="from-purple-500 to-pink-600"
              />
              <TaskColumn
                title="مكتمل"
                tasks={tasksByStatus.completed}
                users={users}
                status="completed"
                gradient="from-green-500 to-emerald-600"
              />
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="opacity-50">
                  <TaskCard
                    task={tasks.find(t => t.id === activeId)!}
                    users={users}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>
    </div>
  );
}
