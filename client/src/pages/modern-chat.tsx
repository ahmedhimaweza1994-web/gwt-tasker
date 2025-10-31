import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Send, MessageSquare, Users, Smile, Paperclip, Mic,
  X, Reply, Image as ImageIcon, File, Download, AtSign,
  Phone, Video, Trash2, Camera, Edit, Search, Plus, MoreVertical, Check
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
  photoUrl?: string;
}

interface ChatMessage {
  id: string;
  content?: string;
  messageType: string;
  senderId: string;
  sender: User;
  senderName?: string;
  reactions: any[];
  createdAt: string;
  attachments?: any[];
  replyTo?: string;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export default function ModernChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState("");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isEditPhotoOpen, setIsEditPhotoOpen] = useState(false);
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

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
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setMessageText("");
      setReplyingTo(null);
      setAttachments([]);
      setRecordedAudio(null);
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
      toast({ title: "تم إنشاء الغرفة", description: "تم إنشاء غرفة الدردشة بنجاح" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiRequest("DELETE", `/api/chat/messages/${messageId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      toast({ title: "تم حذف الرسالة" });
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiRequest("POST", `/api/chat/messages/${messageId}/reactions`, { emoji });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
    },
  });

  const updateGroupPhotoMutation = useMutation({
    mutationFn: async ({ roomId, photoUrl }: { roomId: string; photoUrl: string }) => {
      const res = await apiRequest("PATCH", `/api/chat/rooms/${roomId}`, { photoUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setIsEditPhotoOpen(false);
      setGroupPhotoFile(null);
      toast({ title: "تم تحديث صورة المجموعة" });
    },
  });

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && recordingStartTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current!) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket message handler
  useEffect(() => {
    if (lastMessage) {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    }
  }, [lastMessage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
    } catch (error) {
      toast({ title: "فشل التسجيل", description: "تأكد من السماح بالوصول إلى الميكروفون", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    }
  };

  const handleSendMessage = () => {
    if (!selectedRoom || (!messageText.trim() && !recordedAudio && attachments.length === 0)) return;

    const messageData: any = {
      roomId: selectedRoom.id,
      content: messageText,
      messageType: recordedAudio ? 'voice' : attachments.length > 0 ? 'attachment' : 'text',
      replyTo: replyingTo?.id,
    };

    if (attachments.length > 0) {
      messageData.attachments = attachments;
    }

    if (recordedAudio) {
      const reader = new FileReader();
      reader.onloadend = () => {
        messageData.audioData = reader.result;
        sendMessageMutation.mutate(messageData);
      };
      reader.readAsDataURL(recordedAudio);
    } else {
      sendMessageMutation.mutate(messageData);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: reader.result,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      const newAttachments = await Promise.all(
        imageItems.map(async (item) => {
          const file = item.getAsFile();
          if (!file) return null;
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onloadend = () => {
              resolve({
                name: file.name || 'pasted-image.png',
                type: 'image',
                url: reader.result,
                size: file.size,
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      setAttachments([...attachments, ...newAttachments.filter(Boolean) as any[]]);
    }
  };

  const startCall = async (isVideo: boolean) => {
    if (!selectedRoom) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });
      localStreamRef.current = stream;
      setIsInCall(true);

      // Notify room members via WebSocket
      sendMessage(JSON.stringify({
        type: 'call_start',
        roomId: selectedRoom.id,
        callType: isVideo ? 'video' : 'audio',
        from: user?.id,
      }));

      toast({ title: "جاري الاتصال...", description: isVideo ? "مكالمة فيديو" : "مكالمة صوتية" });
    } catch (error) {
      toast({ title: "فشل بدء المكالمة", variant: "destructive" });
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsInCall(false);

    if (selectedRoom) {
      sendMessage(JSON.stringify({
        type: 'call_end',
        roomId: selectedRoom.id,
      }));
    }
  };

  const handleCreateRoom = () => {
    if (selectedMembers.length === 0) {
      toast({ title: "يجب اختيار عضو واحد على الأقل", variant: "destructive" });
      return;
    }

    createRoomMutation.mutate({
      type: selectedMembers.length > 1 ? 'group' : 'private',
      name: selectedMembers.length > 1 ? newRoomName : undefined,
      memberIds: selectedMembers,
    });
  };

  const handleUpdateGroupPhoto = () => {
    if (!groupPhotoFile || !selectedRoom) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateGroupPhotoMutation.mutate({
        roomId: selectedRoom.id,
        photoUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(groupPhotoFile);
  };

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    const roomName = room.type === 'group' ? room.name :
      room.members.find(m => m.id !== user?.id)?.fullName || '';
    return roomName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredMessages = messages.filter(message => {
    if (!chatSearchQuery) return true;
    return message.content?.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
      message.senderName?.toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === 'group') return room.name || 'مجموعة';
    const otherMember = room.members.find(m => m.id !== user?.id);
    return otherMember?.fullName || 'محادثة';
  };

  const getRoomAvatar = (room: ChatRoom) => {
    if (room.type === 'group') {
      return room.photoUrl ? (
        <img src={room.photoUrl} alt={room.name} className="w-full h-full object-cover" />
      ) : (
        <Users className="w-6 h-6" />
      );
    }
    const otherMember = room.members.find(m => m.id !== user?.id);
    return otherMember?.fullName[0] || 'U';
  };

  return (
    <div className="min-h-screen pb-8">
      <Background3D />
      <ModernNavigation />
      <ModernSidebar />

      <div className="container mx-auto px-4 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]"
        >
          {/* Rooms List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <Card className="glass-dark border-white/10 shadow-glow h-full flex flex-col">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    المحادثات
                  </h2>
                  <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                    <DialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button size="icon" className="bg-gradient-primary hover:bg-gradient-primary/90 rounded-xl shadow-glow">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </DialogTrigger>
                    <DialogContent className="glass-dark border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">إنشاء محادثة جديدة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">اسم المجموعة (اختياري)</Label>
                          <Input
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="اسم المجموعة"
                            className="glass border-white/10 text-white mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-white">الأعضاء</Label>
                          <ScrollArea className="h-64 mt-2 glass rounded-xl p-4">
                            {users.filter(u => u.id !== user?.id).map(u => (
                              <div key={u.id} className="flex items-center gap-3 mb-3">
                                <Checkbox
                                  checked={selectedMembers.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedMembers(
                                      checked
                                        ? [...selectedMembers, u.id]
                                        : selectedMembers.filter(id => id !== u.id)
                                    );
                                  }}
                                />
                                <Label className="text-white cursor-pointer">{u.fullName}</Label>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateRoom} className="bg-gradient-primary">
                          إنشاء
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث..."
                    className="pr-10 glass border-white/10 text-white"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  <AnimatePresence>
                    {filteredRooms.map((room, index) => (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          onClick={() => setSelectedRoom(room)}
                          className={cn(
                            "p-4 rounded-xl cursor-pointer transition-all group",
                            selectedRoom?.id === room.id
                              ? "glass-dark shadow-glow"
                              : "hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {selectedRoom?.id === room.id && (
                                <motion.div
                                  className="absolute inset-0 bg-gradient-primary rounded-full blur-lg"
                                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                              <Avatar className="relative w-12 h-12 border-2 border-white/10">
                                <AvatarFallback className="bg-gradient-primary text-white">
                                  {getRoomAvatar(room)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate">
                                {getRoomDisplayName(room)}
                              </p>
                              {room.lastMessage && (
                                <p className="text-sm text-gray-400 truncate">
                                  {room.lastMessage.content || 'مرفق'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            {selectedRoom ? (
              <Card className="glass-dark border-white/10 shadow-glow h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-white/10">
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {getRoomAvatar(selectedRoom)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {getRoomDisplayName(selectedRoom)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedRoom.members.length} {selectedRoom.type === 'group' ? 'أعضاء' : 'عضو'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search in chat */}
                    {showChatSearch ? (
                      <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }}>
                        <Input
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          placeholder="بحث في المحادثة..."
                          className="glass border-white/10 text-white"
                          onBlur={() => !chatSearchQuery && setShowChatSearch(false)}
                        />
                      </motion.div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowChatSearch(true)}
                        className="glass hover:bg-white/10"
                      >
                        <Search className="w-5 h-5" />
                      </Button>
                    )}

                    {/* Audio Call */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => isInCall ? endCall() : startCall(false)}
                      className={cn(
                        "glass hover:bg-white/10",
                        isInCall && "bg-red-500/20 text-red-400"
                      )}
                    >
                      <Phone className="w-5 h-5" />
                    </Button>

                    {/* Video Call */}
                    {selectedRoom.type === 'group' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => isInCall ? endCall() : startCall(true)}
                        className={cn(
                          "glass hover:bg-white/10",
                          isInCall && "bg-red-500/20 text-red-400"
                        )}
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                    )}

                    {/* Edit Group Photo */}
                    {selectedRoom.type === 'group' && (
                      <Dialog open={isEditPhotoOpen} onOpenChange={setIsEditPhotoOpen}>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="glass hover:bg-white/10">
                            <Camera className="w-5 h-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-dark border-white/10">
                          <DialogHeader>
                            <DialogTitle className="text-white">تعديل صورة المجموعة</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setGroupPhotoFile(e.target.files?.[0] || null)}
                              className="glass border-white/10 text-white"
                            />
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateGroupPhoto} className="bg-gradient-primary">
                              حفظ
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {filteredMessages.map((message, index) => {
                        const isOwnMessage = message.senderId === user?.id;
                        const replyToMsg = message.replyTo ? messages.find(m => m.id === message.replyTo) : null;

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.02 }}
                            className={cn(
                              "flex gap-3",
                              isOwnMessage ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            {!isOwnMessage && (
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarFallback className="bg-gradient-secondary text-white text-sm">
                                  {message.sender?.fullName?.[0] || message.senderName?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className={cn("flex-1 max-w-[70%]", isOwnMessage && "flex flex-col items-end")}>
                              {!isOwnMessage && (
                                <p className="text-sm text-gray-400 mb-1 mr-1">
                                  {message.sender?.fullName || message.senderName}
                                </p>
                              )}

                              <div className="group relative">
                                <div
                                  className={cn(
                                    "p-4 rounded-2xl glass-dark shadow-lg hover:shadow-glow-hover transition-all",
                                    isOwnMessage ? "bg-gradient-primary/10" : "bg-white/5"
                                  )}
                                >
                                  {/* Reply Preview */}
                                  {replyToMsg && (
                                    <div className="mb-2 pb-2 border-b border-white/10">
                                      <p className="text-xs text-gray-400 mb-1">رداً على:</p>
                                      <p className="text-sm text-gray-300 truncate">
                                        {replyToMsg.content}
                                      </p>
                                    </div>
                                  )}

                                  {/* Message Content */}
                                  {message.content && (
                                    <p className="text-white whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  )}

                                  {/* Attachments */}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((att, i) => (
                                        <div key={i}>
                                          {att.type === 'image' ? (
                                            <img
                                              src={att.url}
                                              alt={att.name}
                                              className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                          ) : (
                                            <a
                                              href={att.url}
                                              download={att.name}
                                              className="flex items-center gap-2 p-2 glass rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                              <File className="w-4 h-4" />
                                              <span className="text-sm truncate">{att.name}</span>
                                              <Download className="w-4 h-4 ml-auto" />
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Voice Message */}
                                  {message.messageType === 'voice' && (
                                    <audio controls className="w-full mt-2" src={message.content} />
                                  )}

                                  {/* Timestamp */}
                                  <p className="text-xs text-gray-500 mt-2">
                                    {format(new Date(message.createdAt), "HH:mm", { locale: ar })}
                                  </p>

                                  {/* Reactions */}
                                  {message.reactions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {Object.entries(
                                        message.reactions.reduce((acc: any, r: any) => {
                                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                          return acc;
                                        }, {})
                                      ).map(([emoji, count]) => (
                                        <Badge
                                          key={emoji}
                                          variant="outline"
                                          className="glass border-white/20 text-xs px-2 py-0.5"
                                        >
                                          {emoji} {count}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Message Actions */}
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/50 rounded-lg p-1">
                                  {/* React */}
                                  <Popover
                                    open={openReactionPopover === message.id}
                                    onOpenChange={(open) => setOpenReactionPopover(open ? message.id : null)}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-6 w-6">
                                        <Smile className="w-3 h-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="glass-dark border-white/10 w-auto p-2">
                                      <div className="flex gap-1">
                                        {EMOJI_LIST.map((emoji) => (
                                          <Button
                                            key={emoji}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              addReactionMutation.mutate({ messageId: message.id, emoji });
                                              setOpenReactionPopover(null);
                                            }}
                                            className="text-xl hover:scale-125 transition-transform"
                                          >
                                            {emoji}
                                          </Button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  {/* Reply */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setReplyingTo(message)}
                                    className="h-6 w-6"
                                  >
                                    <Reply className="w-3 h-3" />
                                  </Button>

                                  {/* Delete (own messages only) */}
                                  {isOwnMessage && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteMessageMutation.mutate(message.id)}
                                      className="h-6 w-6 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-6 border-t border-white/10">
                  {/* Reply Preview */}
                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mb-3 p-3 glass rounded-xl flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">رداً على {replyingTo.senderName}</p>
                          <p className="text-sm text-white truncate">{replyingTo.content}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setReplyingTo(null)}
                          className="shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((att, i) => (
                        <div key={i} className="relative glass rounded-lg p-2 group">
                          {att.type === 'image' ? (
                            <img src={att.url} alt={att.name} className="h-20 rounded" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <File className="w-5 h-5" />
                              <span className="text-sm">{att.name}</span>
                            </div>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recording Preview */}
                  {(isRecording || recordedAudio) && (
                    <div className="mb-3 p-3 glass rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white">
                          {isRecording ? `جاري التسجيل... ${recordingDuration}s` : 'تسجيل صوتي جاهز'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {isRecording ? (
                          <Button size="sm" onClick={stopRecording} variant="destructive">
                            إيقاف
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setRecordedAudio(null);
                              setRecordingDuration(0);
                            }}
                            variant="ghost"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* File Upload */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      className="glass hover:bg-white/10 shrink-0"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    {/* Voice Recording */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "glass hover:bg-white/10 shrink-0",
                        isRecording && "bg-red-500/20 text-red-400"
                      )}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>

                    {/* Message Input */}
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="اكتب رسالة... (يمكنك لصق الصور)"
                      className="glass border-white/10 text-white resize-none min-h-[60px] max-h-[120px]"
                    />

                    {/* Send Button */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() && !recordedAudio && attachments.length === 0}
                        className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow h-[60px] px-6 shrink-0"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="glass-dark border-white/10 shadow-glow h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-20 h-20 text-gray-500 mx-auto mb-4 opacity-50" />
                  <p className="text-xl text-gray-400">اختر محادثة للبدء</p>
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
