import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Trophy,
  Star,
  Trash2,
  ArrowRight,
  Eye,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Task } from "@shared/schema";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TaskKanbanProps {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  underReviewTasks: Task[];
  completedTasks: Task[];
}

export default function TaskKanban({ pendingTasks, inProgressTasks, underReviewTasks, completedTasks }: TaskKanbanProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [assignPointsDialog, setAssignPointsDialog] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });
  const [rewardPoints, setRewardPoints] = useState("");
  
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { taskId: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/tasks/${data.taskId}`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({
        title: "تم تحديث المهمة",
        description: "تم تغيير حالة المهمة بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث المهمة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PUT", `/api/tasks/${taskId}/approve-review`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      toast({
        title: "تمت الموافقة على المهمة",
        description: "تم إكمال المهمة بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الموافقة على المهمة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleMoveTask = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const handleApproveTask = (taskId: string) => {
    approveTaskMutation.mutate(taskId);
  };

  const assignPointsMutation = useMutation({
    mutationFn: async (data: { taskId: string; rewardPoints: number }) => {
      const res = await apiRequest("PUT", `/api/tasks/${data.taskId}/assign-points`, { rewardPoints: data.rewardPoints });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setAssignPointsDialog({ open: false, taskId: null });
      setRewardPoints("");
      toast({
        title: "تم تعيين النقاط بنجاح",
        description: "تمت إضافة نقاط المكافأة للمهمة والموظف",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تعيين النقاط",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleAssignPoints = () => {
    const points = parseInt(rewardPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عدد صحيح من النقاط",
        variant: "destructive",
      });
      return;
    }
    if (assignPointsDialog.taskId) {
      assignPointsMutation.mutate({ taskId: assignPointsDialog.taskId, rewardPoints: points });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high": return "عالي";
      case "medium": return "متوسط";
      case "low": return "منخفض";
      default: return priority;
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow border-border/50 hover:border-primary/30">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {task.title}
              </h4>
              {task.companyName && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {task.companyName}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {task.status === 'pending' && (
                  <DropdownMenuItem onClick={() => handleMoveTask(task.id, 'in_progress')}>
                    <ArrowRight className="w-4 h-4 ml-2" />
                    نقل إلى قيد التنفيذ
                  </DropdownMenuItem>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <DropdownMenuItem onClick={() => handleMoveTask(task.id, 'under_review')}>
                      <ArrowRight className="w-4 h-4 ml-2" />
                      نقل للمراجعة
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoveTask(task.id, 'pending')}>
                      <ArrowRight className="w-4 h-4 ml-2" />
                      إرجاع للانتظار
                    </DropdownMenuItem>
                  </>
                )}
                {task.status === 'under_review' && user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => handleApproveTask(task.id)}>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    الموافقة والإكمال
                  </DropdownMenuItem>
                )}
                {task.status === 'completed' && user?.role === 'admin' && !task.rewardPoints && (
                  <DropdownMenuItem onClick={() => setAssignPointsDialog({ open: true, taskId: task.id })}>
                    <Star className="w-4 h-4 ml-2" />
                    تعيين نقاط
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف المهمة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs border", getPriorityColor(task.priority))}>
              {getPriorityLabel(task.priority)}
            </Badge>
            {task.rewardPoints && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Trophy className="w-3 h-3" />
                {task.rewardPoints} نقطة
              </Badge>
            )}
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('ar')}
            </div>
          )}

          {task.assignedToUser && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {task.assignedToUser.fullName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {task.assignedToUser.fullName}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );

  const KanbanColumn = ({ 
    title, 
    tasks, 
    icon, 
    color 
  }: { 
    title: string; 
    tasks: Task[]; 
    icon: React.ReactNode; 
    color: string;
  }) => (
    <div className="flex-1 min-w-[280px]">
      <Card className={cn("h-full border-t-4", color)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </div>
            <Badge variant="secondary" className="text-sm">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto px-3">
          <AnimatePresence mode="popLayout">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  {icon}
                  <p className="text-sm">لا توجد مهام</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <KanbanColumn
          title="قيد الانتظار"
          tasks={pendingTasks}
          icon={<Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />}
          color="border-t-yellow-500"
        />
        <KanbanColumn
          title="قيد التنفيذ"
          tasks={inProgressTasks}
          icon={<AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500" />}
          color="border-t-blue-500"
        />
        <KanbanColumn
          title="تحت المراجعة"
          tasks={underReviewTasks}
          icon={<Eye className="w-5 h-5 text-purple-600 dark:text-purple-500" />}
          color="border-t-purple-500"
        />
        <KanbanColumn
          title="مكتمل"
          tasks={completedTasks}
          icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />}
          color="border-t-green-500"
        />
      </div>

      <Dialog open={assignPointsDialog.open} onOpenChange={(open) => setAssignPointsDialog({ open, taskId: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              تعيين نقاط المكافأة
            </DialogTitle>
            <DialogDescription>
              أدخل عدد النقاط التي تريد منحها للموظف عند إكمال هذه المهمة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reward-points" className="text-base font-medium">
                عدد النقاط
              </Label>
              <Input
                id="reward-points"
                type="number"
                min="1"
                placeholder="مثال: 10"
                value={rewardPoints}
                onChange={(e) => setRewardPoints(e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                سيتم إضافة هذه النقاط إلى رصيد الموظف المكلف بالمهمة
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAssignPoints} disabled={!rewardPoints || assignPointsMutation.isPending} className="flex-1">
              {assignPointsMutation.isPending ? "جاري التعيين..." : "تعيين النقاط"}
            </Button>
            <Button variant="outline" onClick={() => setAssignPointsDialog({ open: false, taskId: null })}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
