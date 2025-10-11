import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Medal, Crown } from "lucide-react";
import { User } from "@shared/schema";

interface LeaderboardProps {
  limit?: number;
  showTitle?: boolean;
}

export default function Leaderboard({ limit = 5, showTitle = true }: LeaderboardProps) {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Sort users by totalPoints in descending order
  const topUsers = [...users]
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, limit);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500 animate-trophy-float" />;
      case 1:
        return <Trophy className="w-5 h-5 text-gray-400 animate-bounce-in" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600 animate-bounce-in" />;
      default:
        return <Star className="w-4 h-4 text-muted-foreground animate-star-twinkle" />;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 0:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">المركز الأول</Badge>;
      case 1:
        return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white">المركز الثاني</Badge>;
      case 2:
        return <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">المركز الثالث</Badge>;
      default:
        return <Badge variant="outline">#{rank + 1}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="leaderboard-card">
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              لوحة المتصدرين
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  if (topUsers.length === 0) {
    return (
      <Card data-testid="leaderboard-card">
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              لوحة المتصدرين
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-center text-muted-foreground py-8">لا توجد بيانات للعرض</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="leaderboard-card" className="overflow-hidden">
      {showTitle && (
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
            لوحة المتصدرين
          </CardTitle>
          <p className="text-sm text-muted-foreground">أفضل الموظفين من حيث نقاط المكافأة</p>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className={`p-4 flex items-center gap-4 transition-all hover:bg-muted/50 ${
                index === 0 ? 'bg-yellow-50/50 dark:bg-yellow-950/10 top-rank-glow' : ''
              }`}
              data-testid={`leaderboard-user-${user.id}`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* Avatar */}
              <Avatar className={`${index === 0 ? 'w-12 h-12 ring-2 ring-yellow-500' : 'w-10 h-10'}`}>
                <AvatarImage src={user.profilePicture || undefined} alt={user.fullName} />
                <AvatarFallback className={index === 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : ''}>
                  {user.fullName?.split(" ")[0]?.charAt(0) || "م"}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold truncate ${index === 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-foreground'}`} data-testid={`leaderboard-user-name-${user.id}`}>
                    {user.fullName}
                  </p>
                  {getRankBadge(index)}
                </div>
                <p className="text-sm text-muted-foreground truncate" data-testid={`leaderboard-user-dept-${user.id}`}>
                  {user.department} {user.jobTitle && `• ${user.jobTitle}`}
                </p>
              </div>

              {/* Points */}
              <div className="flex-shrink-0 text-left">
                <div className="flex items-center gap-1">
                  <Star className={`w-5 h-5 ${index === 0 ? 'fill-yellow-500 text-yellow-500 animate-sparkle' : 'fill-yellow-400 text-yellow-500'}`} />
                  <span className={`font-bold ${index === 0 ? 'text-xl points-gradient' : 'text-lg text-foreground'}`} data-testid={`leaderboard-user-points-${user.id}`}>
                    {user.totalPoints || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center">نقطة</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
