import { Badge } from "./badge";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Progress } from "./progress";
import { Checkbox } from "./checkbox";
import { 
  Calendar, 
  Paperclip, 
  MessageSquare, 
  MoreHorizontal,
  CheckCircle,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityLabels, taskStatusLabels } from "@/lib/arabic-utils";

interface TaskCardProps {
  id?: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignees: string[];
  deadline?: string;
  progress?: number;
  attachments?: number;
  variant?: "default" | "list";
  className?: string;
}

export default function TaskCard({
  id,
  title,
  description,
  priority,
  status,
  assignees,
  deadline,
  progress,
  attachments = 0,
  variant = "default",
  className
}: TaskCardProps) {
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-destructive/10 text-destructive border-destructive/20";
      case "high": return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "medium": return "bg-chart-4/10 text-chart-4 border-chart-4/20";
      case "low": return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      case "in_progress": return "bg-primary/10 text-primary border-primary/20";
      case "pending": return "bg-chart-4/10 text-chart-4 border-chart-4/20";
      case "cancelled": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (variant === "list") {
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer",
        status === "completed" && "opacity-60",
        className
      )} data-testid={`task-card-${id}`}>
        <Checkbox 
          checked={status === "completed"}
          className="w-5 h-5"
          data-testid={`task-checkbox-${id}`}
        />
        
        <div className="flex-1">
          <h4 className={cn(
            "font-semibold text-foreground mb-1",
            status === "completed" && "line-through"
          )}>
            {title}
          </h4>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          
          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className={getPriorityColor(priority)}>
              {priorityLabels[priority]}
            </Badge>
            <Badge variant="outline" className={getStatusColor(status)}>
              {taskStatusLabels[status]}
            </Badge>
            
            {deadline && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{deadline}</span>
              </div>
            )}
            
            {attachments > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <span>{attachments}</span>
              </div>
            )}
          </div>
        </div>

        {assignees.length > 0 && (
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((assignee, index) => (
              <Avatar key={index} className="w-6 h-6 border-2 border-background">
                <AvatarFallback className="text-xs">
                  {assignee.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs text-muted-foreground">+{assignees.length - 3}</span>
              </div>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" data-testid={`task-actions-${id}`}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-background rounded-lg p-4 border border-border hover:shadow-md transition-all cursor-pointer group",
      status === "completed" && "opacity-75",
      className
    )} data-testid={`task-card-${id}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className={cn(
          "font-semibold text-foreground group-hover:text-primary transition-colors",
          status === "completed" && "line-through"
        )}>
          {title}
        </h4>
        
        <div className="flex items-center gap-2">
          {status === "completed" && (
            <CheckCircle className="w-5 h-5 text-chart-1" />
          )}
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{description}</p>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={getPriorityColor(priority)}>
          {priorityLabels[priority]}
        </Badge>
        {status !== "pending" && (
          <Badge variant="outline" className={getStatusColor(status)}>
            {taskStatusLabels[status]}
          </Badge>
        )}
      </div>

      {progress !== undefined && progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>التقدم</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignees.length > 0 ? (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee, index) => (
                <Avatar key={index} className="w-6 h-6 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {assignee.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-primary-foreground">+{assignees.length - 3}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{deadline}</span>
            </div>
          )}
          {attachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{attachments}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
