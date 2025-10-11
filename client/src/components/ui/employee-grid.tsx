import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Eye, MoreVertical } from "lucide-react";
import { formatDuration, auxStatusLabels, departmentLabels } from "@/lib/arabic-utils";

interface Employee {
  id: string;
  fullName: string;
  username: string;
  department: string;
  currentAux: string;
  auxDuration: number;
  currentTask?: string;
  avatar?: string;
  isOnline: boolean;
  lastActivity?: string;
}

interface EmployeeGridProps {
  employees?: Employee[];
  searchQuery: string;
  departmentFilter: string;
  statusFilter: string;
}

export default function EmployeeGrid({ 
  employees, 
  searchQuery, 
  departmentFilter, 
  statusFilter 
}: EmployeeGridProps) {
  const [liveEmployees, setLiveEmployees] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { subscribe } = useWebSocket("employee-update");

  // Subscribe to real-time employee updates
  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      setLiveEmployees(prevEmployees => {
        const existingIndex = prevEmployees.findIndex(emp => emp.id === data.id);
        if (existingIndex >= 0) {
          const updated = [...prevEmployees];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          return updated;
        } else {
          return [...prevEmployees, data];
        }
      });
    });

    return unsubscribe;
  }, [subscribe]);

  // Mock data for demonstration
  const mockEmployees: Employee[] = [
    {
      id: "1",
      fullName: "أحمد محمد علي",
      username: "ahmed@company.com",
      department: "development",
      currentAux: "working",
      auxDuration: 9018, // 2:30:18
      currentTask: "تطوير واجهة المستخدم للتقارير",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      isOnline: true,
      lastActivity: "منذ دقيقة واحدة",
    },
    {
      id: "2",
      fullName: "سارة أحمد محمود",
      username: "sara@company.com",
      department: "design",
      currentAux: "break",
      auxDuration: 932, // 0:15:32
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      isOnline: true,
      lastActivity: "منذ 5 دقائق",
    },
    {
      id: "3",
      fullName: "محمد علي حسن",
      username: "mohamed@company.com",
      department: "sales",
      currentAux: "ready",
      auxDuration: 4365, // 1:12:45
      currentTask: "متابعة العملاء المحتملين",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      isOnline: true,
      lastActivity: "منذ 3 دقائق",
    },
    {
      id: "4",
      fullName: "نور حسن محمد",
      username: "nour@company.com",
      department: "development",
      currentAux: "working",
      auxDuration: 13522, // 3:45:22
      currentTask: "إصلاح أخطاء نظام المصادقة",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      isOnline: true,
      lastActivity: "الآن",
    },
    {
      id: "5",
      fullName: "خالد أحمد سعد",
      username: "khaled@company.com",
      department: "marketing",
      currentAux: "personal",
      auxDuration: 1800, // 0:30:00
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      isOnline: false,
      lastActivity: "منذ 20 دقيقة",
    },
  ];

  const displayEmployees = employees || liveEmployees.length > 0 ? liveEmployees : mockEmployees;

  // Filter employees based on search and filters
  const filteredEmployees = displayEmployees.filter(employee => {
    const matchesSearch = !searchQuery || 
      employee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.currentAux === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAuxStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-chart-1 text-white";
      case "working": return "bg-primary text-white";
      case "personal": return "bg-chart-4 text-white";
      case "break": return "bg-chart-2 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>الموظفين المتصلين الآن</CardTitle>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-chart-1/10 border border-chart-1/20">
              <span className="w-2 h-2 rounded-full bg-chart-1 animate-pulse"></span>
              <span className="text-xs font-medium text-chart-1">تحديث مباشر</span>
            </div>
          </div>
          <CardDescription>
            عرض {paginatedEmployees.length} من {filteredEmployees.length} موظف
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right font-semibold">الموظف</TableHead>
                <TableHead className="text-right font-semibold">القسم</TableHead>
                <TableHead className="text-right font-semibold">حالة AUX</TableHead>
                <TableHead className="text-right font-semibold">المدة</TableHead>
                <TableHead className="text-right font-semibold">المهمة الحالية</TableHead>
                <TableHead className="text-right font-semibold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.map((employee) => (
                <TableRow 
                  key={employee.id} 
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`employee-row-${employee.id}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={employee.avatar} alt={employee.fullName} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span 
                          className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-background ${
                            employee.isOnline ? 'bg-chart-1' : 'bg-muted-foreground'
                          }`}
                        ></span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{employee.fullName}</p>
                        <p className="text-xs text-muted-foreground">{employee.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">
                      {departmentLabels[employee.department as keyof typeof departmentLabels] || employee.department}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                      </span>
                      <Badge className={getAuxStatusColor(employee.currentAux)}>
                        {auxStatusLabels[employee.currentAux as keyof typeof auxStatusLabels]}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span 
                      className="font-mono text-sm font-semibold"
                      data-testid={`employee-duration-${employee.id}`}
                    >
                      {formatTimer(employee.auxDuration)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-xs">
                      {employee.currentTask ? (
                        <div>
                          <p className="text-sm text-foreground truncate">{employee.currentTask}</p>
                          <p className="text-xs text-muted-foreground">
                            قيد التنفيذ • {employee.lastActivity}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-view-employee-${employee.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-employee-actions-${employee.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredEmployees.length)} من {filteredEmployees.length} موظف
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                السابق
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
