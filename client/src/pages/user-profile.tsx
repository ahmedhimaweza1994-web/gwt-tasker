import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import NavHeader from "@/components/ui/nav-header";
import Sidebar from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Calendar,
  Camera,
  Briefcase,
  Building,
  CheckCircle,
  Users,
  Code,
  MessageSquare,
  Edit,
  Save,
  X,
  Phone,
  MapPin,
  Trophy,
  Star
} from "lucide-react";

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const userId = id || currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isOwnProfile,
  });

  const { data: auxSessions } = useQuery<any[]>({
    queryKey: ["/api/aux/sessions"],
    enabled: isOwnProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الملف الشخصي بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث الملف الشخصي",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    setEditData({
      fullName: profile?.fullName || "",
      department: profile?.department || "",
      jobTitle: profile?.jobTitle || "",
      bio: profile?.bio || "",
      phoneNumber: profile?.phoneNumber || "",
      address: profile?.address || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  if (profileLoading || !profile) {
    return (
      <div className="flex h-screen bg-background rtl-grid">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavHeader />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </main>
        </div>
      </div>
    );
  }

  const completedTasks = tasks?.filter((t: any) => t.status === "done").length || 0;
  const totalTasks = tasks?.length || 0;
  const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const recentActivities = [
    ...(tasks?.slice(0, 2).map((task: any) => ({
      id: task.id,
      type: "task_completed",
      title: task.status === "done" ? "أكمل مهمة" : "يعمل على مهمة",
      description: task.title,
      time: "مؤخراً",
      icon: task.status === "done" ? CheckCircle : Code,
      color: task.status === "done" ? "text-chart-1" : "text-primary",
    })) || []),
    ...(auxSessions?.slice(0, 2).map((session: any) => ({
      id: session.id,
      type: "aux_session",
      title: "جلسة عمل",
      description: session.status,
      time: "مؤخراً",
      icon: Users,
      color: "text-chart-2",
    })) || []),
  ].slice(0, 4);

  return (
    <div className="flex h-screen bg-background rtl-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NavHeader />

        <main className="flex-1 overflow-y-auto">
          {/* Cover Photo */}
          <div className="relative h-64 bg-gradient-to-br from-primary via-secondary to-chart-1">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          <div className="container mx-auto px-6 py-0 max-w-5xl">
            {/* Profile Header */}
            <div className="relative -mt-20 mb-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl">
                    <AvatarImage src={profile.profilePicture} alt={profile.fullName} />
                    <AvatarFallback className="text-2xl">
                      {profile.fullName?.split(" ")[0]?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* User Info */}
                <div className="flex-1 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-1" data-testid="text-user-fullname">
                        {profile.fullName}
                      </h1>
                      <p className="text-lg text-muted-foreground mb-3" data-testid="text-user-jobtitle">
                        {profile.jobTitle || "لا يوجد مسمى وظيفي"}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span data-testid="text-user-department">{profile.department}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span data-testid="text-user-email">{profile.email}</span>
                        </div>
                        {profile.phoneNumber && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <span data-testid="text-user-phone">{profile.phoneNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>انضم في {new Date(profile.hireDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long" })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button onClick={handleEditClick} data-testid="button-edit-profile">
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل الملف الشخصي
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={handleSave}
                              disabled={updateProfileMutation.isPending}
                              data-testid="button-save-profile"
                            >
                              <Save className="w-4 h-4 ml-2" />
                              حفظ
                            </Button>
                            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                              <X className="w-4 h-4 ml-2" />
                              إلغاء
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {isOwnProfile && (
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground" data-testid="text-total-tasks">{totalTasks}</p>
                        <p className="text-sm text-muted-foreground">مهام</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground" data-testid="text-completed-tasks">{completedTasks}</p>
                        <p className="text-sm text-muted-foreground">مهمة مكتملة</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground" data-testid="text-productivity-percentage">{productivity}%</p>
                        <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
                          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-total-points">{profile.totalPoints || 0}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">نقاط المكافأة</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
              {/* Left Sidebar */}
              <div className="space-y-6">
                {/* About */}
                <Card>
                  <CardHeader>
                    <CardTitle>عن المستخدم</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fullName">الاسم الكامل</Label>
                          <Input
                            id="fullName"
                            value={editData.fullName || ""}
                            onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                            data-testid="input-edit-fullname"
                          />
                        </div>
                        <div>
                          <Label htmlFor="department">القسم</Label>
                          <Input
                            id="department"
                            value={editData.department || ""}
                            onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                            data-testid="input-edit-department"
                          />
                        </div>
                        <div>
                          <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                          <Input
                            id="jobTitle"
                            value={editData.jobTitle || ""}
                            onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                            data-testid="input-edit-jobtitle"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio">نبذة</Label>
                          <Textarea
                            id="bio"
                            value={editData.bio || ""}
                            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                            rows={4}
                            data-testid="input-edit-bio"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                          <Input
                            id="phoneNumber"
                            value={editData.phoneNumber || ""}
                            onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                            data-testid="input-edit-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">العنوان</Label>
                          <Input
                            id="address"
                            value={editData.address || ""}
                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                            data-testid="input-edit-address"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground leading-relaxed" data-testid="text-user-bio">
                          {profile.bio || "لا توجد نبذة متاحة"}
                        </p>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-primary" />
                            <span className="text-sm text-foreground">{profile.jobTitle || "لا يوجد مسمى وظيفي"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Building className="w-4 h-4 text-primary" />
                            <span className="text-sm text-foreground">{profile.department}</span>
                          </div>
                          {profile.address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="text-sm text-foreground">{profile.address}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Tasks */}
                {isOwnProfile && tasks && tasks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>المهام النشطة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {tasks.slice(0, 3).map((task: any) => (
                        <div key={task.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground mb-1">{task.title}</h4>
                              <p className="text-sm text-muted-foreground">{task.description || "لا يوجد وصف"}</p>
                            </div>
                            <Badge variant={task.status === "done" ? "default" : "secondary"}>
                              {task.status === "todo" ? "قيد الانتظار" : task.status === "in-progress" ? "قيد التنفيذ" : "مكتمل"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                {isOwnProfile && recentActivities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>النشاط الأخير</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentActivities.map((activity) => {
                          const Icon = activity.icon;
                          return (
                            <div key={activity.id} className="flex gap-4">
                              <div className="flex-shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center`}>
                                  <Icon className={`w-4 h-4 ${activity.color}`} />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-foreground">
                                  <span className="font-semibold">{activity.title}</span>
                                  {" "}
                                  {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.time}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
