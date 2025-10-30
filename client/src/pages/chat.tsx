import { useState, useEffect, useRef } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
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
import { 
  Send, MessageSquare, Users, Smile, Paperclip, Mic, 
  X, Reply, Image as ImageIcon, File, Download, AtSign,
  Phone, PhoneOff, MoreVertical, Search, Video, Trash2
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
  replyTo?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState("");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null);
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: User; roomId: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reactionsDialogMessage, setReactionsDialogMessage] = useState<ChatMessage | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeCallRoomIdRef = useRef<string | null>(null);
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      setOpenReactionPopover(null);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiRequest("DELETE", `/api/chat/messages/${messageId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الرسالة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل حذف الرسالة",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = await Promise.all(
      Array.from(files).map(async (file) => {
        const reader = new FileReader();
        return new Promise<any>((resolve) => {
          reader.onloadend = () => {
            resolve({
              name: file.name,
              type: file.type.startsWith("image/") ? "image" : "file",
              url: reader.result as string,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setAttachments([...attachments, ...newAttachments]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedAudio(blob);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingStartTime(null);
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (error) {
      toast({
        title: "خطأ",
        description: "لا يمكن الوصول إلى الميكروفون",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Update recording timer
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, recordingStartTime]);

  const handleSendMessage = async () => {
    if (!selectedRoom) return;
    
    let content = messageText.trim();
    let messageType = "text";
    let messageAttachments = attachments;

    if (recordedAudio) {
      const reader = new FileReader();
      const audioDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(recordedAudio);
      });

      messageAttachments = [{
        name: "تسجيل صوتي",
        type: "audio",
        url: audioDataUrl,
      }];
      messageType = "file";
      content = "🎤 تسجيل صوتي";
    }

    if (!content && messageAttachments.length === 0) return;

    sendMessageMutation.mutate({
      roomId: selectedRoom.id,
      content: content || (messageAttachments.length > 0 ? "📎 مرفق" : ""),
      messageType: messageAttachments.length > 0 ? "file" : messageType,
      attachments: messageAttachments,
      replyTo: replyingTo?.id,
    });
  };

  const startCall = async () => {
    if (!selectedRoom || selectedRoom.type !== 'private') return;
    
    try {
      activeCallRoomIdRef.current = selectedRoom.id;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.onicecandidate = (event) => {
        if (event.candidate && activeCallRoomIdRef.current) {
          sendMessage({ 
            type: 'ice_candidate', 
            roomId: activeCallRoomIdRef.current, 
            candidate: event.candidate 
          });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
        }
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play();
        if (ringtone) {
          ringtone.pause();
          ringtone.currentTime = 0;
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendMessage({ 
        type: 'call_offer', 
        roomId: activeCallRoomIdRef.current, 
        offer 
      });
      
      if (ringtone) {
        ringtone.loop = true;
        ringtone.play().catch(console.error);
      }
      
      setIsInCall(true);
      toast({ title: "جاري الاتصال...", description: "انتظر إجابة المستخدم الآخر" });
    } catch (error) {
      toast({ title: "خطأ", description: "لا يمكن بدء المكالمة", variant: "destructive" });
    }
  };

  const endCall = (sendEndSignal = true) => {
    const callRoomId = activeCallRoomIdRef.current;
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    setIsInCall(false);
    activeCallRoomIdRef.current = null;
    
    if (sendEndSignal && callRoomId) {
      sendMessage({ type: 'call_end', roomId: callRoomId });
    }
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

  const insertMention = (userName: string) => {
    const newText = messageText + `@${userName} `;
    setMessageText(newText);
    setShowMentions(false);
    setMentionSearch("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastWord = messageText.split(" ").pop() || "";
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionSearch(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [messageText]);

  useEffect(() => {
    const ringtoneAudio = new Audio();
    ringtoneAudio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////////////////////////////////////AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SPI67WAAAAAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZJ4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    ringtoneAudio.volume = 0.5;
    setRingtone(ringtoneAudio);
    
    return () => {
      if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!lastMessage) return;

    const handleCallMessage = async () => {
      const pc = peerConnectionRef.current;
      const activeRoomId = activeCallRoomIdRef.current;

      if (lastMessage.type === 'call_offer') {
        if (!activeRoomId) {
          activeCallRoomIdRef.current = lastMessage.roomId;
          const newPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          peerConnectionRef.current = newPc;
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          stream.getTracks().forEach(track => newPc.addTrack(track, stream));

          newPc.onicecandidate = (event) => {
            if (event.candidate && activeCallRoomIdRef.current) {
              sendMessage({ type: 'ice_candidate', roomId: activeCallRoomIdRef.current, candidate: event.candidate });
            }
          };

          newPc.ontrack = (event) => {
            if (!remoteAudioRef.current) {
              remoteAudioRef.current = new Audio();
            }
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play();
          };

          await newPc.setRemoteDescription(new RTCSessionDescription(lastMessage.offer));
          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);
          sendMessage({ type: 'call_answer', roomId: lastMessage.roomId, answer });
          setIsInCall(true);
        }
      } else if (lastMessage.type === 'call_answer' && pc && lastMessage.roomId === activeRoomId) {
        await pc.setRemoteDescription(new RTCSessionDescription(lastMessage.answer));
      } else if (lastMessage.type === 'ice_candidate' && pc && lastMessage.roomId === activeRoomId) {
        await pc.addIceCandidate(new RTCIceCandidate(lastMessage.candidate));
      } else if (lastMessage.type === 'call_end' && lastMessage.roomId === activeRoomId) {
        endCall(false);
      }
    };

    handleCallMessage().catch(console.error);
  }, [lastMessage]);

  const getRoomName = (room: ChatRoom) => {
    if (room.type === 'group') return room.name || 'غرفة جماعية';
    const otherMember = room.members.find(m => m.id !== user?.id);
    return otherMember?.fullName || 'دردشة خاصة';
  };

  const getReplyMessage = (replyId?: string) => {
    return messages.find(m => m.id === replyId);
  };

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '✨'];

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.name === 'الغرفة العامة') return -1;
    if (b.name === 'الغرفة العامة') return 1;
    return 0;
  });

  const filteredUsers = users
    .filter((u) => 
      u.id !== user?.id && 
      u.fullName.toLowerCase().includes(mentionSearch.toLowerCase())
    );

  const filteredRooms = sortedRooms.filter(room =>
    getRoomName(room).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className={cn("flex-1 h-screen flex bg-gradient-to-br from-background to-muted/20 transition-all duration-300", isCollapsed ? "lg:mr-[90px]" : "lg:mr-64")}>
          {/* Sidebar with rooms */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 border-l border-border bg-card/50 backdrop-blur-sm"
          >
            <div className="p-4 border-b border-border bg-card/80">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  الدردشات
                </h2>
                <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 shadow-lg hover:shadow-primary/50 transition-all" data-testid="button-create-room">
                      <Users className="w-4 h-4" />
                      غرفة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
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
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>الأعضاء</Label>
                        <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                          {users
                            .filter((u) => u.id !== user?.id)
                            .map((u) => (
                              <div key={u.id} className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded px-2 transition-colors">
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
                                <Label htmlFor={`member-${u.id}`} className="cursor-pointer flex-1">
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
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث في الدردشات..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10" 
                  data-testid="input-search-chat" 
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-250px)]">
              <AnimatePresence mode="popLayout">
                {filteredRooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "p-4 cursor-pointer transition-all duration-200",
                      "hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10",
                      "border-b border-border/50",
                      selectedRoom?.id === room.id && "bg-gradient-to-r from-primary/20 to-accent/20 border-l-4 border-l-primary"
                    )}
                    data-testid={`room-item-${room.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Avatar className="ring-2 ring-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {room.type === 'group' ? <Users className="w-4 h-4" /> : getRoomName(room)[0]}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{getRoomName(room)}</p>
                          {room.name === 'الغرفة العامة' && (
                            <Badge variant="secondary" className="text-xs">عامة</Badge>
                          )}
                        </div>
                        {room.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>
            <div className="p-4 border-t border-border bg-card/80">
              <p className="text-sm text-muted-foreground mb-2 font-medium">بدء دردشة خاصة</p>
              <ScrollArea className="max-h-32">
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <motion.div
                      key={u.id}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start mb-1 hover:bg-primary/10"
                        onClick={() => startPrivateChatMutation.mutate(u.id)}
                        data-testid={`button-private-chat-${u.id}`}
                      >
                        <MessageSquare className="w-4 h-4 ml-2" />
                        {u.fullName}
                      </Button>
                    </motion.div>
                  ))}
              </ScrollArea>
            </div>
          </motion.div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
            {selectedRoom ? (
              <>
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-4 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-primary/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        {selectedRoom.type === 'group' ? <Users className="w-4 h-4" /> : getRoomName(selectedRoom)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{getRoomName(selectedRoom)}</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-sm text-muted-foreground">
                          {selectedRoom.members.length} أعضاء
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRoom.type === 'private' && (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant={isInCall ? "destructive" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={isInCall ? endCall : startCall}
                          data-testid="button-call"
                        >
                          {isInCall ? (
                            <>
                              <PhoneOff className="w-4 h-4" />
                              <span>إنهاء</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-4 h-4" />
                              <span>مكالمة</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Search className="w-4 h-4 ml-2" />
                          بحث في المحادثة
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Video className="w-4 h-4 ml-2" />
                          مكالمة فيديو
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف المحادثة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {messages.map((message, index) => {
                        const isOwnMessage = message.senderId === user?.id;
                        const replyMessage = getReplyMessage(message.replyTo);
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                              delay: index * 0.02
                            }}
                            className={cn(
                              "flex gap-3 group",
                              isOwnMessage && "flex-row-reverse"
                            )}
                            data-testid={`message-${message.id}`}
                          >
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="flex-shrink-0"
                            >
                              <Avatar className="ring-2 ring-border">
                                <AvatarFallback className={cn(
                                  isOwnMessage && "bg-gradient-to-br from-primary to-accent text-white"
                                )}>
                                  {message.sender.fullName[0]}
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                            <div className={cn(
                              "flex-1 space-y-1",
                              isOwnMessage && "items-end flex flex-col"
                            )}>
                              <p className="text-sm font-medium text-muted-foreground">
                                {message.sender.fullName}
                              </p>
                              
                              {replyMessage && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className={cn(
                                    "text-xs p-2 rounded-lg bg-muted/50 border-l-2 border-primary mb-1",
                                    isOwnMessage && "border-r-2 border-l-0"
                                  )}
                                >
                                  <p className="font-medium">{replyMessage.sender.fullName}</p>
                                  <p className="text-muted-foreground">{replyMessage.content}</p>
                                </motion.div>
                              )}

                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className={cn(
                                  "inline-block p-3 rounded-2xl max-w-[70%] shadow-md",
                                  "transition-all duration-200",
                                  isOwnMessage
                                    ? "bg-gradient-to-r from-primary to-accent text-white rounded-br-none"
                                    : "bg-card border border-border rounded-bl-none"
                                )}
                              >
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="space-y-2 mb-2">
                                    {message.attachments.map((att, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                      >
                                        {att.type === "image" ? (
                                          <img
                                            src={att.url}
                                            alt={att.name}
                                            className="rounded-lg max-w-xs hover:scale-105 transition-transform cursor-pointer"
                                            onClick={() => setImagePreview(att.url)}
                                          />
                                        ) : att.type === "audio" ? (
                                          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/10">
                                            <Mic className="w-4 h-4" />
                                            <audio controls src={att.url} className="flex-1" />
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/10 hover:bg-background/20 transition-colors cursor-pointer">
                                            <File className="w-4 h-4" />
                                            <span className="text-sm">{att.name}</span>
                                            <Download className="w-4 h-4 ml-auto" />
                                          </div>
                                        )}
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                <p className={cn(
                                  "text-xs mt-1",
                                  isOwnMessage ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {new Date(message.createdAt).toLocaleTimeString("ar", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </motion.div>

                              <div className="flex items-center gap-2">
                                {message.reactions && message.reactions.length > 0 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex gap-1 bg-muted rounded-full px-2 py-1 cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => setReactionsDialogMessage(message)}
                                  >
                                    {message.reactions.slice(0, 3).map((reaction, i) => (
                                      <span key={i} className="text-sm">{reaction.emoji}</span>
                                    ))}
                                    {message.reactions.length > 3 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{message.reactions.length - 3}
                                      </span>
                                    )}
                                  </motion.div>
                                )}

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <Popover open={openReactionPopover === message.id} onOpenChange={(open) => setOpenReactionPopover(open ? message.id : null)}>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <Smile className="w-3 h-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2">
                                      <div className="flex gap-1">
                                        {reactions.map((emoji) => (
                                          <Button
                                            key={emoji}
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:scale-125 transition-transform"
                                            onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                                          >
                                            {emoji}
                                          </Button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setReplyingTo(message)}
                                  >
                                    <Reply className="w-3 h-3" />
                                  </Button>
                                  {isOwnMessage && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirm("هل أنت متأكد من حذف هذه الرسالة؟")) {
                                          deleteMessageMutation.mutate(message.id);
                                        }
                                      }}
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

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-4 border-t border-border bg-card/80 backdrop-blur-sm"
                >
                  {replyingTo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Reply className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs font-medium">رد على {replyingTo.sender.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {replyingTo.content}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  )}

                  {attachments.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mb-2 flex gap-2 flex-wrap"
                    >
                      {attachments.map((att, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative group"
                        >
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="h-20 w-20 object-cover rounded-lg border-2 border-border"
                            />
                          ) : (
                            <div className="h-20 w-20 bg-muted rounded-lg border-2 border-border flex items-center justify-center">
                              <File className="w-8 h-8" />
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {recordedAudio && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4 text-primary" />
                      <audio
                        controls
                        src={URL.createObjectURL(recordedAudio)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecordedAudio(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        className="hidden"
                        accept="image/*,application/pdf"
                      />
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="button-attach"
                          className="hover:bg-primary/10"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={isRecording ? stopRecording : startRecording}
                          data-testid="button-record"
                          className={cn(
                            "hover:bg-primary/10",
                            isRecording && "bg-destructive text-white animate-pulse"
                          )}
                        >
                          <Mic className="w-4 h-4" />
                        </Button>
                        {isRecording && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-destructive text-white text-xs px-2 py-1 rounded-full whitespace-nowrap"
                          >
                            {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                    <div className="flex-1 relative">
                      <Textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="اكتب رسالتك..."
                        className="min-h-[44px] max-h-32 resize-none pr-10"
                        data-testid="input-message"
                      />
                      {showMentions && filteredUsers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg p-2 max-h-40 overflow-y-auto"
                        >
                          {filteredUsers.map((u) => (
                            <Button
                              key={u.id}
                              variant="ghost"
                              className="w-full justify-start hover:bg-primary/10"
                              onClick={() => insertMention(u.fullName)}
                            >
                              <AtSign className="w-4 h-4 ml-2" />
                              {u.fullName}
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() && attachments.length === 0 && !recordedAudio}
                        data-testid="button-send-message"
                        className="gap-2 shadow-lg hover:shadow-primary/50 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        إرسال
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <MessageSquare className="w-20 h-20 mx-auto text-muted-foreground/50" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-muted-foreground">
                    اختر محادثة للبدء
                  </h3>
                  <p className="text-muted-foreground">
                    حدد دردشة من القائمة أو ابدأ محادثة جديدة
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>معاينة الصورة</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <div className="flex items-center justify-center max-h-[70vh]">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full max-h-full rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reactions Dialog */}
      <Dialog open={!!reactionsDialogMessage} onOpenChange={() => setReactionsDialogMessage(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>التفاعلات</DialogTitle>
          </DialogHeader>
          {reactionsDialogMessage && reactionsDialogMessage.reactions && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {reactionsDialogMessage.reactions.map((reaction, index) => {
                // Find the user who reacted
                const reactingUser = users.find(u => u.id === reaction.userId);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10">
                          {reactingUser?.fullName?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{reactingUser?.fullName || 'مستخدم'}</p>
                        <p className="text-sm text-muted-foreground">{reactingUser?.email || ''}</p>
                      </div>
                    </div>
                    <span className="text-2xl">{reaction.emoji}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
