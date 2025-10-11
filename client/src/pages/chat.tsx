import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, MessageSquare, Users, Smile } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface ChatRoom {
  id: string;
  name?: string;
  type: 'private' | 'group';
  members: User[];
  lastMessage?: any;
}

interface ChatMessage {
  id: string;
  content?: string;
  messageType: string;
  senderId: string;
  sender: User;
  reactions: any[];
  createdAt: string;
  attachments?: any[];
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState("");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    refetchInterval: 3000,
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages", selectedRoom?.id],
    enabled: !!selectedRoom,
    refetchInterval: 2000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chat/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      setMessageText("");
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chat/rooms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setCreateRoomOpen(false);
      setNewRoomName("");
      setSelectedMembers([]);
      toast({
        title: "تم إنشاء الغرفة",
        description: "تم إنشاء غرفة الدردشة بنجاح",
      });
    },
  });

  const startPrivateChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const res = await apiRequest("POST", "/api/chat/private", { otherUserId });
      return res.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoom(room);
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiRequest("POST", "/api/chat/reactions", { messageId, emoji });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRoom) return;

    sendMessageMutation.mutate({
      roomId: selectedRoom.id,
      content: messageText,
      messageType: "text",
    });
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || selectedMembers.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الغرفة واختيار الأعضاء",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: newRoomName,
      type: "group",
      memberIds: selectedMembers,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getRoomName = (room: ChatRoom) => {
    if (room.type === 'group') return room.name || 'غرفة جماعية';
    const otherMember = room.members.find(m => m.id !== user?.id);
    return otherMember?.fullName || 'دردشة خاصة';
  };

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 mr-64 h-screen flex">
          <div className="w-80 border-l border-border bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">الدردشات</h2>
                <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-room">
                      <Users className="w-4 h-4 ml-2" />
                      غرفة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إنشاء غرفة دردشة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="room-name">اسم الغرفة</Label>
                        <Input
                          id="room-name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          placeholder="أدخل اسم الغرفة"
                          data-testid="input-room-name"
                        />
                      </div>
                      <div>
                        <Label>الأعضاء</Label>
                        <ScrollArea className="h-48 border rounded-md p-2">
                          {users
                            .filter((u) => u.id !== user?.id)
                            .map((u) => (
                              <div key={u.id} className="flex items-center gap-2 py-2">
                                <Checkbox
                                  id={`member-${u.id}`}
                                  checked={selectedMembers.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers([...selectedMembers, u.id]);
                                    } else {
                                      setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                                    }
                                  }}
                                  data-testid={`checkbox-member-${u.id}`}
                                />
                                <Label htmlFor={`member-${u.id}`} className="cursor-pointer">
                                  {u.fullName}
                                </Label>
                              </div>
                            ))}
                        </ScrollArea>
                      </div>
                      <Button onClick={handleCreateRoom} className="w-full" data-testid="button-submit-room">
                        إنشاء الغرفة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Input placeholder="بحث..." data-testid="input-search-chat" />
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 cursor-pointer hover:bg-muted transition ${
                    selectedRoom?.id === room.id ? 'bg-muted' : ''
                  }`}
                  data-testid={`room-item-${room.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {room.type === 'group' ? <Users className="w-4 h-4" /> : getRoomName(room)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{getRoomName(room)}</p>
                      {room.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="p-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">بدء دردشة خاصة</p>
              <ScrollArea className="max-h-32">
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <Button
                      key={u.id}
                      variant="ghost"
                      className="w-full justify-start mb-1"
                      onClick={() => startPrivateChatMutation.mutate(u.id)}
                      data-testid={`button-private-chat-${u.id}`}
                    >
                      <MessageSquare className="w-4 h-4 ml-2" />
                      {u.fullName}
                    </Button>
                  ))}
              </ScrollArea>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedRoom ? (
              <>
                <div className="p-4 border-b border-border bg-card">
                  <h3 className="font-bold text-lg">{getRoomName(selectedRoom)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRoom.members.length} أعضاء
                  </p>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[70%] ${msg.senderId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                          {msg.senderId !== user?.id && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {msg.sender.fullName}
                            </p>
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              msg.senderId === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.messageType === 'meeting_link' && msg.attachments?.[0] ? (
                              <div>
                                <p className="font-medium mb-2">{msg.content}</p>
                                <a
                                  href={msg.attachments[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm underline"
                                >
                                  انضم للاجتماع
                                </a>
                              </div>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {reactions.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                className="text-xs hover:bg-muted p-1 rounded"
                                data-testid={`reaction-${emoji}-${msg.id}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          {msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {msg.reactions.map((reaction, idx) => (
                                <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                  {reaction.emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب رسالة..."
                      data-testid="input-message"
                    />
                    <Button onClick={handleSendMessage} disabled={!messageText.trim()} data-testid="button-send-message">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>اختر دردشة للبدء</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
