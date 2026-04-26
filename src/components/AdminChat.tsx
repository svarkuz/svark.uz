import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, updateDoc, doc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Image as ImageIcon, 
  Video, 
  CirclePlay, 
  MoreVertical, 
  Maximize2,
  Phone, 
  User,
  CheckCheck,
  X,
  StopCircle,
  MessageSquare,
  Users,
  Paperclip,
  FileText,
  Download,
  RefreshCw,
  Type as TypeIcon,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  type: 'text' | 'voice' | 'image' | 'video' | 'round_video' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: any;
  read: boolean;
}

const VideoMessage = ({ src }: { src: string }) => {
  const [isFull, setIsFull] = useState(false);
  return (
    <div className="space-y-4">
      <div 
        className={`relative rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 bg-black cursor-pointer transition-all duration-300 ${isFull ? 'fixed inset-0 z-[100] m-0 rounded-none' : 'w-full h-auto max-w-sm'}`}
        onClick={() => setIsFull(!isFull)}
      >
        <video src={src} controls={!isFull} autoPlay={isFull} className="w-full h-full object-contain" />
        {isFull && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full"
            onClick={(e) => { e.stopPropagation(); setIsFull(false); }}
          >
            <X className="w-8 h-8" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const AdminChat: React.FC<{ 
  user: any; 
  isAdmin: boolean; 
  initialChatUserId?: string | null;
  onChatOpened?: () => void;
}> = ({ user, isAdmin, initialChatUserId, onChatOpened }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatUserId || null);

  // Load last messages for each chat
  useEffect(() => {
    if (isAdmin && user && users.length > 0) {
      const unsubs = users.map(u => {
        const q = query(
          collection(db, 'messages'),
          where('senderId', 'in', [user.uid, u.uid]),
          where('receiverId', 'in', [user.uid, u.uid]),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        return onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setLastMessages(prev => ({
              ...prev,
              [u.uid]: snapshot.docs[0].data()
            }));
          }
        });
      });
      return () => unsubs.forEach(unsub => unsub());
    }
  }, [isAdmin, user, users]);

  useEffect(() => {
    if (initialChatUserId) {
      setActiveChatId(initialChatUserId);
      if (onChatOpened) onChatOpened();
    }
  }, [initialChatUserId]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | 'round_video' | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMobile, setIsMobile] = useState(false);
  const [editingImage, setEditingImage] = useState<{ url: string; name: string } | null>(null);
  const [imageText, setImageText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#2563eb');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load users for admin/worker
  useEffect(() => {
    if (isAdmin) {
      // Show all users who are not admins (i.e., customers and masters)
      const q = query(collection(db, 'users'), where('role', '!=', 'admin'));
      const unsub = onSnapshot(q, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Admin chat users listener error:", error);
      });

      // Find the main admin for workers to chat with
      const adminQ = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
      const adminUnsub = onSnapshot(adminQ, (snapshot) => {
        if (!snapshot.empty) {
          setAdminUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      });

      return () => {
        unsub();
        adminUnsub();
      };
    } else {
      // For clients, find the admin to chat with
      const adminQ = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
      const unsub = onSnapshot(adminQ, (snapshot) => {
        if (!snapshot.empty) {
          const admin = snapshot.docs[0].id;
          setActiveChatId(admin);
          setAdminUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          // Fallback to broadcast if no admin found yet
          setActiveChatId('admin_broadcast');
        }
      });
      return () => unsub();
    }
  }, [isAdmin]);

  // Load unread counts for admin
  useEffect(() => {
    if (isAdmin && user && user.uid) {
      const q = query(
        collection(db, 'messages'),
        where('receiverId', '==', user.uid),
        where('read', '==', false)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          counts[data.senderId] = (counts[data.senderId] || 0) + 1;
        });
        setUnreadCounts(counts);
      }, (error) => {
        console.error("Unread counts listener error:", error);
      });
      return () => unsub();
    }
  }, [isAdmin, user]);

  // Mark notifications as read when chat is active
  useEffect(() => {
    if (user && user.uid && activeChatId) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('type', '==', 'new_message'),
        where('read', '==', false)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach(async (docSnap) => {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(docSnap.ref, { read: true });
        });
      });
      
      return () => unsubscribe();
    }
  }, [user, activeChatId]);

  // Load messages
  useEffect(() => {
    if (!user || !activeChatId) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [user.uid, activeChatId]),
      where('receiverId', 'in', [user.uid, activeChatId]),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      
      // Mark as read
      msgs.forEach(msg => {
        if (msg.receiverId === user.uid && !msg.read) {
          updateDoc(doc(db, 'messages', msg.id), { read: true });
        }
      });

      // Show system notification for new incoming messages
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.senderId !== user.uid && !lastMsg.read) {
        if ("Notification" in window && Notification.permission === "granted") {
          const sender = users.find(u => u.uid === lastMsg.senderId) || adminUser;
          const senderName = sender?.displayName || (isAdmin ? 'Mijoz' : 'Admin');
          
          new Notification(`Yangi xabar: ${senderName}`, {
            body: lastMsg.text || 'Yangi media xabar',
            icon: 'https://i.ibb.co/rGStjV9t/photo-2026-04-19-13-06-56.jpg'
          });
        }
      }
    }, (error) => {
      console.error("Chat listener error:", error);
    });

    return () => unsub();
  }, [user, activeChatId]);

  const sendMessage = useCallback(async (type: Message['type'] = 'text', fileUrl?: string, fileName?: string, overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if (!textToSend.trim() && !fileUrl) return;
    if (!activeChatId) {
      toast.error("Suhbatdoshni tanlang");
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: activeChatId,
        text: textToSend,
        type,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        createdAt: serverTimestamp(),
        read: false
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: activeChatId,
        type: 'new_message',
        message: isAdmin ? 'Ustadan xabar keldi' : `Yangi xabar: ${user.displayName || 'Mijoz'}`,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      });

      if (overrideText === undefined) {
        setInputText('');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  }, [user, activeChatId, inputText]);

  useEffect(() => {
    const handleAiMessage = (e: any) => {
      if (e.detail && e.detail.text) {
        if (activeChatId) {
          sendMessage('text', undefined, undefined, e.detail.text);
        } else {
          setInputText(e.detail.text);
          toast.info("Suhbatdosh tanlanmagan, xabar yozildi lekin yuborilmadi");
        }
      }
    };
    window.addEventListener('ai-send-message', handleAiMessage);
    return () => window.removeEventListener('ai-send-message', handleAiMessage);
  }, [activeChatId, sendMessage]);

  const startRecording = async (type: 'voice' | 'video' | 'round_video') => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type !== 'voice' ? { facingMode } : false
      });
      setMediaStream(stream);
      setRecordingType(type);
      setIsRecording(true);

      if (videoRef.current && type !== 'voice') {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const mimeType = type === 'voice' ? 'audio/webm' : 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendMessage(type, reader.result as string);
        };
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setRecorder(null);
        setIsRecording(false);
        setRecordingType(null);
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
    } catch (err) {
      toast.error("Media qurilmalariga ruxsat berilmadi");
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isRecording && recordingType !== 'voice') {
      await startRecording(recordingType!);
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (file.type.startsWith('image/')) {
          setEditingImage({ url: result, name: file.name });
        } else {
          let type: Message['type'] = 'file';
          if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'voice';
          sendMessage(type, result, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveEditedImage = () => {
    if (!canvasRef.current || !editingImage) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg');
    sendMessage('image', dataUrl, editingImage.name);
    setEditingImage(null);
    setImageText('');
    setIsDrawing(false);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  useEffect(() => {
    if (editingImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };
      img.src = editingImage.url;
    }
  }, [editingImage]);

  // Apply text separately to not interfere with drawing
  const applyText = () => {
    if (!canvasRef.current || !imageText) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `${Math.floor(canvas.width / 15)}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.strokeText(imageText, canvas.width / 2, canvas.height - 50);
    ctx.fillText(imageText, canvas.width / 2, canvas.height - 50);
    setImageText('');
  };

  const activeUser = isAdmin ? users.find(u => u.uid === activeChatId) || (adminUser?.uid === activeChatId ? adminUser : null) : null;

  const isUserOnline = (u: any) => {
    if (u.isOnline === true) return true;
    if (!u.lastActive) return false;
    // If last active was less than 2 minutes ago
    const lastActive = u.lastActive?.toDate ? u.lastActive.toDate() : new Date(u.lastActive);
    return (new Date().getTime() - lastActive.getTime()) < 120000;
  };

  return (
    <div className={`flex flex-col sm:flex-row transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-white max-w-none m-0 rounded-none' : 'h-full min-h-[calc(100vh-180px)] sm:h-[600px] gap-0 sm:gap-4 bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xl overflow-hidden border-none sm:border sm:border-gray-100'}`}>
      {/* Sidebar for Admin/Worker */}
      {isAdmin && (!activeChatId || !isMobile) && (
        <div className="w-full sm:w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Suhbatlar
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {/* Special Admin Chat for Workers */}
              {adminUser && adminUser.uid !== user.uid && (
                <button
                  onClick={() => setActiveChatId(adminUser.uid)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    activeChatId === adminUser.uid ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <Avatar className="w-12 h-12 border-2 border-white">
                    <AvatarFallback className="bg-blue-600 text-white font-bold">A</AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold truncate">ADMIN (Asosiy)</p>
                    <p className={`text-xs truncate ${activeChatId === adminUser.uid ? 'text-blue-100' : 'text-blue-600'}`}>
                      Tizim administratori
                    </p>
                  </div>
                </button>
              )}

              {users.filter(u => u.uid !== user.uid).map(u => (
                <button
                  key={u.id}
                  onClick={() => setActiveChatId(u.uid)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all group ${
                    activeChatId === u.uid ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className={`w-12 h-12 border-2 ${activeChatId === u.uid ? 'border-blue-400' : 'border-white'}`}>
                      <AvatarImage src={u.photoURL} className="object-cover" />
                      <AvatarFallback className={activeChatId === u.uid ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}>
                        {u.displayName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(u) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h5 className={`font-bold truncate text-sm ${activeChatId === u.uid ? 'text-white' : 'text-gray-900 group-hover:text-blue-600'}`}>
                        {u.displayName}
                      </h5>
                      {lastMessages[u.uid] && (
                        <span className={`text-[10px] shrink-0 font-medium ${activeChatId === u.uid ? 'text-blue-100' : 'text-gray-400'}`}>
                          {lastMessages[u.uid].createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate font-medium ${activeChatId === u.uid ? 'text-blue-100' : 'text-gray-500'}`}>
                      {lastMessages[u.uid] ? (
                        lastMessages[u.uid].type === 'text' ? lastMessages[u.uid].text : 
                        lastMessages[u.uid].type === 'image' ? '📸 Rasm' :
                        lastMessages[u.uid].type === 'video' ? '📹 Video' :
                        lastMessages[u.uid].type === 'voice' ? '🎤 Ovozli' : '📎 Fayl'
                      ) : (u.phone || 'Xabarlar yo\'q')}
                    </p>
                  </div>
                  {unreadCounts[u.uid] > 0 && activeChatId !== u.uid && (
                    <Badge className="bg-blue-600 text-white border-none text-[10px] px-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                      {unreadCounts[u.uid]}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChatId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {isAdmin && isMobile && activeChatId && (
                  <Button variant="ghost" size="icon" onClick={() => setActiveChatId(null)} className="rounded-full mr-1">
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                )}
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {isAdmin ? (activeUser?.displayName?.charAt(0) || 'U') : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-gray-900">
                    {isAdmin ? (activeUser?.displayName || 'Foydalanuvchi') : 'Admin (UMID)'}
                  </h4>
                  {(!activeChatId || (activeUser && isUserOnline(activeUser)) || (!isAdmin && adminUser && isUserOnline(adminUser))) ? (
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Offline</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(activeUser?.phone || (!isAdmin)) && (
                  <a href={`tel:${activeUser?.phone || '+998909323992'}`}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full bg-green-50 hover:bg-green-100"
                    >
                      <Phone className="w-4 h-4 text-green-600" />
                    </Button>
                  </a>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="rounded-full hover:bg-gray-100"
                >
                  {isFullScreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-4 h-4 text-gray-400" /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden">
              <ScrollArea className="h-full p-6" ref={scrollRef}>
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] space-y-1 ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-4 rounded-3xl shadow-sm ${
                            msg.senderId === user.uid
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-900 rounded-tl-none'
                          }`}
                        >
                          {msg.type === 'text' && <p className="text-sm leading-relaxed">{msg.text}</p>}
                          {msg.type === 'image' && (
                            <img src={msg.fileUrl} alt="Sent" className="max-w-full rounded-2xl" referrerPolicy="no-referrer" />
                          )}
                          {msg.type === 'voice' && (
                            <audio src={msg.fileUrl} controls className="max-w-full h-8" />
                          )}
                          {msg.type === 'video' && (
                            <VideoMessage src={msg.fileUrl!} />
                          )}
                          {msg.type === 'round_video' && (
                            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg bg-black">
                              <video src={msg.fileUrl} controls className="w-full h-full object-cover" />
                            </div>
                          )}
                          {msg.type === 'file' && (
                            <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{msg.fileName || 'Fayl'}</p>
                                <p className="text-[10px] opacity-60">Hujjat</p>
                              </div>
                              <a href={msg.fileUrl} download={msg.fileName} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-[10px] text-gray-400">
                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.senderId === user.uid && (
                            <CheckCheck className={`w-3 h-3 ${msg.read ? 'text-blue-500' : 'text-gray-300'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 rounded-full shadow-lg opacity-80 hover:opacity-100"
                onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                <RefreshCw className="w-4 h-4 rotate-180" />
              </Button>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <AnimatePresence>
                {editingImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
                  >
                    <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-bold">Rasmga matn qo'shish</h3>
                        <Button variant="ghost" size="icon" onClick={() => setEditingImage(null)}><X className="w-5 h-5" /></Button>
                      </div>
                      <div className="p-4 flex flex-col items-center gap-4">
                        <div className="flex gap-2 mb-2">
                          {['#2563eb', '#ef4444', '#22c55e', '#eab308', '#000000', '#ffffff'].map(color => (
                            <button
                              key={color}
                              onClick={() => setDrawColor(color)}
                              className={`w-8 h-8 rounded-full border-2 ${drawColor === color ? 'border-blue-600 scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <Button variant="outline" size="sm" onClick={() => {
                            const canvas = canvasRef.current;
                            const ctx = canvas?.getContext('2d');
                            const img = new Image();
                            img.onload = () => ctx?.drawImage(img, 0, 0);
                            img.src = editingImage!.url;
                          }} className="ml-4">
                            Tozalash
                          </Button>
                        </div>
                        <canvas 
                          ref={canvasRef} 
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="max-w-full max-h-[60vh] rounded-xl shadow-inner bg-gray-100 cursor-crosshair touch-none" 
                        />
                        <div className="w-full flex gap-2">
                          <Input 
                            value={imageText} 
                            onChange={(e) => setImageText(e.target.value)}
                            placeholder="Matn kiriting..."
                            className="flex-1 rounded-xl"
                          />
                          <Button onClick={applyText} variant="outline" className="rounded-xl">
                            Matnni qo'shish
                          </Button>
                          <Button onClick={saveEditedImage} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6">
                            Yuborish
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-24 left-4 right-4 bg-gray-900 text-white p-6 rounded-3xl flex flex-col items-center gap-4 z-50 shadow-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="font-bold tracking-widest">Yozib olinmoqda...</span>
                    </div>
                    {recordingType !== 'voice' && (
                      <div className={`relative overflow-hidden border-4 border-white/20 shadow-2xl ${recordingType === 'round_video' ? 'w-64 h-64 rounded-full' : 'w-full max-w-sm aspect-video rounded-2xl'}`}>
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">REC</div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={switchCamera}
                          className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                    <Button 
                      variant="destructive" 
                      onClick={stopRecording}
                      className="rounded-full w-16 h-16 p-0 flex items-center justify-center bg-red-500 hover:bg-red-600"
                    >
                      <StopCircle className="w-8 h-8" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-50 hover:text-blue-600" title="Rasm/Fayl">
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => startRecording('video')} 
                    className={`rounded-full hover:bg-blue-50 hover:text-blue-600 ${isRecording && recordingType === 'video' ? 'text-red-500 bg-red-50' : ''}`}
                    title="Video xabar"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => startRecording('round_video')} 
                    className={`rounded-full hover:bg-blue-50 hover:text-blue-600 ${isRecording && recordingType === 'round_video' ? 'text-red-500 bg-red-50' : ''}`}
                    title="Dumaloq video"
                  >
                    <CirclePlay className="w-5 h-5" />
                  </Button>
                </div>
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Xabar yozing..."
                  className="flex-1 rounded-2xl py-6 bg-gray-50 border-none focus-visible:ring-blue-600"
                />
                <Button 
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl w-12 h-12 p-0 flex items-center justify-center shadow-lg shadow-blue-100"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-12 h-12 text-blue-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Suhbatni boshlang</h3>
            <p className="text-gray-500 max-w-xs mt-2">
              Mijozlar bilan bog'lanish uchun chap tomondagi ro'yxatdan birini tanlang.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
