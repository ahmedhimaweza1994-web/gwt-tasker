import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Calendar,
  Paperclip,
  MessageSquare,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Task } from "@shared/schema";
interface TaskKanbanProps {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  underReviewTasks: Task[];
  completedTasks: Task[];
}
export default function TaskKanban({ pendingTasks, inProgressTasks, underReviewTasks, completedTasks }: TaskKanbanProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { taskId: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/tasks/${data.taskId}`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      // إبطال الـ queries المحددة لتحديث الـ list محليًا بدون ريلوود
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
  // Approve task review mutation
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
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
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
  const formatDate = (dateInput?: string | Date | null) => {
    if (!dateInput) return null;
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   
    if (diffDays < 0) return "متأخر";
    if (diffDays === 0) return "اليوم";
    if (diffDays === 1) return "غداً";
    return `${diffDays} أيام`;
  };
  const TaskCard = ({ task, status }: { task: Task; status: string }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer group" data-testid={`task-card-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-semibold text-foreground text-sm leading-tight flex-1 ml-2">
            {task.title}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleMoveTask(task.id, "pending")}>
                نقل إلى: قيد الانتظار
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoveTask(task.id, "in_progress")}>
                نقل إلى: قيد التنفيذ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoveTask(task.id, "under_review")}>
                نقل إلى: تحت المراجعة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoveTask(task.id, "completed")}>
                نقل إلى: مكتمل
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
            {getPriorityLabel(task.priority)}
          </Badge>
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {task.assignedTo && (
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {task.assignedTo.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
           
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
           
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>0</span>
            </div>
          </div>
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${
              formatDate(task.dueDate) === "متأخر" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {formatDate(task.dueDate) === "متأخر" && <AlertCircle className="w-3 h-3" />}
              {formatDate(task.dueDate) !== "متأخر" && <Calendar className="w-3 h-3" />}
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kanban-board">
      {/* Pending Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                قيد الانتظار
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {pendingTasks.length}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <div className="space-y-3" data-testid="kanban-pending-column">
          {pendingTasks.map((task) => (
            <TaskCard key={task.id} task={task} status="pending" />
          ))}
         
          <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
            <CardContent className="p-4">
              <Button variant="ghost" className="w-full justify-center text-muted-foreground hover:text-foreground" data-testid="button-add-pending-task">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مهمة
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* In Progress Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                قيد التنفيذ
              </CardTitle>
              <Badge variant="default" className="text-xs">
                {inProgressTasks.length}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <div className="space-y-3" data-testid="kanban-progress-column">
          {inProgressTasks.map((task) => (
            <div key={task.id} className="relative">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
              <TaskCard task={task} status="in_progress" />
            </div>
          ))}
         
          <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
            <CardContent className="p-4">
              <Button variant="ghost" className="w-full justify-center text-muted-foreground hover:text-foreground" data-testid="button-add-progress-task">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مهمة
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Under Review Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                تحت المراجعة
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {underReviewTasks.length}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <div className="space-y-3" data-testid="kanban-review-column">
          {underReviewTasks.map((task) => {
            const canApprove = user && (
              user.role === 'admin' || 
              user.role === 'sub-admin' || 
              task.createdBy === user.id
            );
            
            return (
              <div key={task.id} className="relative">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-warning rounded-full"></div>
                <TaskCard task={task} status="under_review" />
                {canApprove && (
                  <Button
                    onClick={() => handleApproveTask(task.id)}
                    disabled={approveTaskMutation.isPending}
                    className="w-full mt-2"
                    size="sm"
                    variant="default"
                    data-testid={`button-approve-task-${task.id}`}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    {approveTaskMutation.isPending ? "جاري الموافقة..." : "الموافقة وإكمال المهمة"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Completed Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                مكتمل
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {completedTasks.length}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <div className="space-y-3" data-testid="kanban-completed-column">
          {completedTasks.map((task) => (
            <div key={task.id} className="opacity-75 hover:opacity-100 transition-opacity">
              <TaskCard task={task} status="completed" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}