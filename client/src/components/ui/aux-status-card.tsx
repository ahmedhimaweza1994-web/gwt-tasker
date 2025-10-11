import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  Coffee, 
  User,
  Edit3
} from "lucide-react";
import { formatDuration, auxStatusLabels } from "@/lib/arabic-utils";

interface AuxStatusCardProps {
  currentStatus: string;
  timer: number;
  isTimerRunning: boolean;
  onStatusChange: (status: string) => void;
}

export default function AuxStatusCard({
  currentStatus,
  timer,
  isTimerRunning,
  onStatusChange
}: AuxStatusCardProps) {
  const [currentNote, setCurrentNote] = useState("");
  const [noteStatus, setNoteStatus] = useState("in_progress");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const auxStatuses = [
    { id: "ready", label: "جاهز", icon: CheckCircle, color: "bg-chart-1", textColor: "text-chart-1" },
    { id: "working", label: "عمل على مشروع", icon: Play, color: "bg-primary", textColor: "text-primary" },
    { id: "personal", label: "شخصي", icon: User, color: "bg-chart-4", textColor: "text-chart-4" },
    { id: "break", label: "استراحة", icon: Coffee, color: "bg-chart-2", textColor: "text-chart-2" },
  ];

  const currentAux = auxStatuses.find(aux => aux.id === currentStatus);

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveNote = async () => {
    try {
      await fetch("/api/aux/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: currentNote,
          status: noteStatus,
          auxStatus: currentStatus,
        }),
        credentials: "include",
      });
      setIsEditingNote(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">الحالة الحالية</CardTitle>
            <CardDescription>تتبع وقت العمل والأنشطة</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-change-aux-status"
          >
            <Edit3 className="w-4 h-4 ml-2" />
            تغيير الحالة
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status Display */}
        <div className={`relative p-6 rounded-xl bg-gradient-to-br ${currentAux?.color || 'bg-muted'}/20 border border-current/20`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${currentAux?.color || 'bg-muted'} flex items-center justify-center`}>
                {currentAux?.icon && <currentAux.icon className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {currentAux?.label || auxStatusLabels[currentStatus as keyof typeof auxStatusLabels]}
                </h3>
                <p className="text-sm text-muted-foreground">الحالة النشطة</p>
              </div>
            </div>
            
            <div className="text-left">
              <div className="text-4xl font-bold text-foreground timer-display" data-testid="aux-timer">
                {formatTimer(timer)}
              </div>
              <p className="text-xs text-muted-foreground">الوقت المستغرق</p>
            </div>
          </div>

          {/* Real-time indicator */}
          {isTimerRunning && (
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-2 px-2 py-1 bg-chart-1/20 rounded-full">
                <span className="w-2 h-2 bg-chart-1 rounded-full animate-pulse"></span>
                <span className="text-xs text-chart-1 font-medium">مباشر</span>
              </div>
            </div>
          )}
        </div>

        {/* AUX Status Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {auxStatuses.map((aux) => (
            <Button
              key={aux.id}
              variant={currentStatus === aux.id ? "default" : "outline"}
              className={`h-20 flex-col gap-2 transition-all hover:scale-105 ${
                currentStatus === aux.id 
                  ? `${aux.color} text-white` 
                  : `hover:${aux.color}/10`
              }`}
              onClick={() => onStatusChange(aux.id)}
              data-testid={`button-aux-${aux.id}`}
            >
              <aux.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{aux.label}</span>
            </Button>
          ))}
        </div>

        {/* Current Task Note */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">شغال على إيه دلوقتي؟</h4>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditingNote(!isEditingNote)}
              data-testid="button-edit-note"
            >
              <Edit3 className="w-4 h-4 ml-2" />
              {isEditingNote ? "إلغاء" : "تعديل"}
            </Button>
          </div>
          
          {isEditingNote ? (
            <div className="space-y-3">
              <Textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="اكتب تفاصيل المهمة أو النشاط الحالي..."
                className="min-h-[100px] resize-none text-right"
                data-testid="textarea-task-note"
              />
              
              <div className="flex items-center justify-between">
                <Select value={noteStatus} onValueChange={setNoteStatus}>
                  <SelectTrigger className="w-48" data-testid="select-note-status">
                    <SelectValue placeholder="حالة المهمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={saveNote} data-testid="button-save-note">
                  حفظ الملاحظة
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground mb-2">
                {currentNote || "تطوير واجهة المستخدم لصفحة التقارير الجديدة"}
              </p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary"
                  className={
                    noteStatus === "completed" ? "bg-chart-1/20 text-chart-1" :
                    noteStatus === "in_progress" ? "bg-chart-4/20 text-chart-4" :
                    "bg-chart-2/20 text-chart-2"
                  }
                >
                  {noteStatus === "completed" ? "مكتمل" :
                   noteStatus === "in_progress" ? "قيد التنفيذ" : "معلق"}
                </Badge>
                <span className="text-xs text-muted-foreground">منذ 45 دقيقة</span>
              </div>
            </div>
          )}
        </div>

        {/* Timer Controls */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button 
            className="flex-1 bg-chart-1 hover:bg-chart-1/90"
            disabled={isTimerRunning}
            data-testid="button-start-timer"
          >
            <Play className="w-4 h-4 ml-2" />
            ابدأ التوقيت
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1"
            disabled={!isTimerRunning}
            data-testid="button-pause-timer"
          >
            <Pause className="w-4 h-4 ml-2" />
            إيقاف مؤقت
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex-1"
            disabled={!isTimerRunning}
            data-testid="button-stop-timer"
          >
            <Square className="w-4 h-4 ml-2" />
            إيقاف
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
