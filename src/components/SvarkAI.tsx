import React, { useState, useRef, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Camera, 
  RefreshCw, 
  Sparkles, 
  Move, 
  Maximize2, 
  RotateCcw, 
  Image as ImageIcon, 
  X, 
  Send, 
  MessageSquare, 
  Phone, 
  User, 
  Upload, 
  Paperclip, 
  Box, 
  Layers, 
  Menu, 
  Plus, 
  History, 
  Trash2,
  Video,
  CirclePlay,
  StopCircle,
  FileText,
  Download,
  ClipboardList,
  Wand2,
  Calculator,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Briefcase,
  Shield,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { analyzeDesignFit, getChatResponse, generateAIImage } from '../lib/geminiService';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const ThreeDOverlay = ({ imageUrl, scale, rotation, position, opacity }: any) => {
  const texture = useTexture(imageUrl) as THREE.Texture;
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh 
      ref={meshRef} 
      position={[position.x, position.y, 0]} 
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale, scale, 1]}
    >
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
};

const CameraBackground = ({ stream }: { stream: MediaStream }) => {
  const { viewport } = useThree();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    
    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn("Video play interrupted:", err);
      }
    };
    
    playVideo();
    videoRef.current = video;
    const texture = new THREE.VideoTexture(video);
    setVideoTexture(texture);
    
    return () => {
      video.pause();
      video.srcObject = null;
      video.remove();
    };
  }, [stream]);

  if (!videoTexture) return null;

  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
      <meshBasicMaterial map={videoTexture} />
    </mesh>
  );
};

const BackgroundMesh = ({ imageUrl }: { imageUrl: string }) => {
  const texture = useTexture(imageUrl);
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
};

interface Overlay {
  id: string;
  imageUrl: string;
  name: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  rotation3D: { x: number; y: number; z: number };
  opacity: number;
}

const VideoMessage = ({ src }: { src: string }) => {
  const [isFull, setIsFull] = useState(false);
  return (
    <div className="space-y-4">
      <div 
        className={`relative rounded-full overflow-hidden shadow-lg border-2 border-white/20 bg-black cursor-pointer transition-all duration-500 ${isFull ? 'fixed inset-0 z-[100] m-0 rounded-none w-screen h-screen' : 'w-24 h-24 sm:w-32 sm:h-32 ml-auto'}`}
        onClick={() => setIsFull(!isFull)}
      >
        <video 
          src={src} 
          controls={isFull} 
          autoPlay 
          loop 
          muted={!isFull}
          className={`w-full h-full ${isFull ? 'object-contain' : 'object-cover'}`} 
        />
        <div className={`absolute inset-0 bg-gold/10 flex items-center justify-center transition-opacity ${isFull ? 'opacity-0' : 'opacity-100'}`}>
          <Video className="w-8 h-8 text-white animate-pulse" />
        </div>
        {isFull && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-10 right-10 text-white bg-black/40 hover:bg-black/60 rounded-full w-14 h-14"
            onClick={(e) => { e.stopPropagation(); setIsFull(false); }}
          >
            <X className="w-10 h-10" />
          </Button>
        )}
      </div>
      {!isFull && (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
          <span className="text-[10px] text-gray-400 font-bold ml-2">Videoni to'liq ko'rish uchun ustiga bosing</span>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 rounded-lg text-[10px] font-bold border-white/10"
            onClick={() => setIsFull(true)}
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            FULL SCREEN
          </Button>
        </div>
      )}
    </div>
  );
};

export const SvarkAI: React.FC<{ user: any }> = ({ user }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', text: "Salom! Men Svark AI yordamchisiman. Sizga qanday yordam bera olaman? Masalan, darvoza va reshotka dizaynlari haqida so'rashingiz yoki rasm yuklab maslahat olishingiz mumkin." }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedMimeType, setAttachedMimeType] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Overlay state
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(0.8);
  const [customDesignImage, setCustomDesignImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | 'round_video' | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [isLiveVideo, setIsLiveVideo] = useState(false);
  const [designBackground, setDesignBackground] = useState<string | null>(null);
  const [designProduct, setDesignProduct] = useState<string | null>(null);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<string | null>(null);
  const [designPrompt, setDesignPrompt] = useState('');
  const [library, setLibrary] = useState<{
    videos: any[],
    designs: any[],
    responses: any[],
    files: any[]
  }>({
    videos: [],
    designs: [],
    responses: [],
    files: []
  });
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [tryOnStep, setTryOnStep] = useState<'product' | 'background' | 'interactive'>('product');
  const [tryOnProduct, setTryOnProduct] = useState<string | null>(null);
  const [tryOnPos, setTryOnPos] = useState({ x: 50, y: 50 });
  const [tryOnScale, setTryOnScale] = useState(1);
  const [tryOnRotation, setTryOnRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setTryOnPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const removeBackgroundUtil = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageSrc);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 220 && g > 220 && b > 220) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.src = imageSrc;
    });
  };

  const handleRemoveBackground = async (overlayId: string) => {
    const overlay = overlays.find(o => o.id === overlayId);
    if (!overlay) return;

    setIsRemovingBg(true);
    const toastId = toast.loading("AI orqa fonni tozalamoqda...");
    
    try {
      const newUrl = await removeBackgroundUtil(overlay.imageUrl);
      setOverlays(prev => prev.map(o => o.id === overlayId ? { ...o, imageUrl: newUrl } : o));
      toast.dismiss(toastId);
      toast.success("Orqa fon tozalandi!");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("AI xatoligi");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const startRecording = async (type: 'voice' | 'video' | 'round_video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type !== 'voice'
      });
      setMediaStream(stream);
      setRecordingType(type);
      setIsRecording(true);

      if (chatVideoRef.current && type !== 'voice') {
        chatVideoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const mimeType = type === 'voice' ? 'audio/webm' : 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const mediaUrl = reader.result as string;
          setMessages(prev => [...prev, { 
            role: 'user', 
            text: type === 'voice' ? 'Ovozli xabar' : 'Video xabar',
            mediaUrl: mediaUrl,
            mediaType: type
          }]);

          if (type === 'video' || type === 'round_video') {
            setChatLoading(true);
            try {
              const response = await getChatResponse(
                "Ushbu videoni tahlil qilib javob bering. Men professional svarkachi yordamchisi sifatida savol beryapman.", 
                mediaUrl.split(',')[1], 
                mimeType
              );
              setMessages(prev => [...prev, { role: 'ai', text: response }]);
            } catch (err) {
              console.error("AI Video analysis error:", err);
            } finally {
              setChatLoading(false);
            }
          }
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

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };
  const [is3DMode, setIs3DMode] = useState(false);
  const [rotation3D, setRotation3D] = useState({ x: 0, y: 0, z: 0 });
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (stream) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatTopRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleSelectProduct = async (product: any) => {
    setIsRemovingBg(true);
    try {
      const processedUrl = await removeBackgroundUtil(product.imageUrl);
      const newOverlay: Overlay = {
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: processedUrl,
        name: product.name,
        position: { x: 50, y: 50 },
        scale: 1,
        rotation: 0,
        rotation3D: { x: 0, y: 0, z: 0 },
        opacity: 0.8
      };
      setOverlays(prev => [...prev, newOverlay]);
      setActiveOverlayId(newOverlay.id);
      toast.success("AI orqa fonni kesib tashladi va yangi element qo'shildi!");
    } catch (error) {
      const newOverlay: Overlay = {
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: product.imageUrl,
        name: product.name,
        position: { x: 50, y: 50 },
        scale: 1,
        rotation: 0,
        rotation3D: { x: 0, y: 0, z: 0 },
        opacity: 0.8
      };
      setOverlays(prev => [...prev, newOverlay]);
      setActiveOverlayId(newOverlay.id);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const captureImage = () => {
    if ((!videoRef.current && !backgroundImage) || !containerRef.current || overlays.length === 0) return;
    
    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    if (backgroundImage) {
      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.onload = () => {
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        drawOverlaysOnCanvas(canvas, ctx);
      };
      bgImg.src = backgroundImage;
    } else if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      drawOverlaysOnCanvas(canvas, ctx);
    }
  };

  const drawOverlaysOnCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    let loadedCount = 0;
    overlays.forEach(overlay => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const rect = containerRef.current!.getBoundingClientRect();
        const overlayWidth = (canvas.width * (300 / rect.width)) * overlay.scale;
        const overlayHeight = (img.height / img.width) * overlayWidth;
        
        const x = (overlay.position.x / 100) * canvas.width;
        const y = (overlay.position.y / 100) * canvas.height;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        ctx.globalAlpha = overlay.opacity;
        ctx.drawImage(img, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
        ctx.restore();

        loadedCount++;
        if (loadedCount === overlays.length) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `svark-ai-design-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("Rasm saqlandi!");
          setIsCapturing(false);
        }
      };
      img.src = overlay.imageUrl;
    });
  };

  const getAiRecommendation = async () => {
    if ((!videoRef.current && !backgroundImage) || overlays.length === 0) {
      toast.error("Avval dizaynlarni tanlang va kamera yoki fon rasmini yoqing");
      return;
    }

    setIsAiAnalyzing(true);
    try {
      let base64 = '';
      if (backgroundImage) {
        base64 = backgroundImage.split(',')[1];
      } else if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      }

      const prompt = `Ushbu rasmda uyni yoki xonani ko'rishingiz mumkin. Men unga quyidagi dizaynlarni joylashtirmoqchiman: ${overlays.map(o => o.name).join(', ')}. 
      Iltimos, ushbu dizaynlarni qayerga va qanday o'lchamda joylashtirish bo'yicha professional maslahat bering. 
      Masalan, darvozani qayerga, reshotkani qaysi derazaga qo'yish kerakligini ayting. 
      Shuningdek, ushbu dizaynlar uydagi boshqa elementlar (eshik, deraza) bilan qanday mos tushishini tushuntiring.`;

      const response = await getChatResponse(prompt, base64, 'image/jpeg');
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      toast.success("AI tavsiyasi tayyor! Chat bo'limiga o'ting.");
    } catch (error) {
      toast.error("AI tahlilida xatolik yuz berdi");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribe();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startCamera = async () => {
    setLoading(true);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = { 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      toast.error("Kamerani ishga tushirib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        setAttachedMimeType(file.type);
        setAttachedFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          url: reader.result as string,
          name: file.name,
          type: file.type
        });
        setAttachedImage(null);
        setAttachedMimeType(null);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const q = query(
        collection(db, 'ai_chats'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const startNewChat = () => {
    setMessages([
      { role: 'ai', text: "Salom! Men Svark AI yordamchisiman. Sizga qanday yordam bera olaman? Masalan, darvoza dizaynlari haqida so'rashingiz yoki rasm yuklab maslahat olishingiz mumkin." }
    ]);
    setCurrentSessionId(null);
    setIsHistoryOpen(false);
  };

  const loadChatSession = (session: any) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsHistoryOpen(false);
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'ai_chats', sessionId));
      if (currentSessionId === sessionId) startNewChat();
      toast.success("Suhbat o'chirildi");
    } catch (error) {
      toast.error("O'chirishda xatolik");
    }
  };

  const saveChatSession = async (updatedMessages: any[]) => {
    if (!user?.uid) return;
    
    try {
      if (currentSessionId) {
        await updateDoc(doc(db, 'ai_chats', currentSessionId), {
          messages: updatedMessages,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'ai_chats'), {
          userId: user.uid,
          title: (updatedMessages.find(m => m.role === 'user')?.text || 'Yangi suhbat').substring(0, 50),
          messages: updatedMessages.map(m => {
            const cleanMsg: any = { role: m.role, text: m.text || '' };
            if (m.image) cleanMsg.image = m.image;
            if (m.mediaUrl) cleanMsg.mediaUrl = m.mediaUrl;
            if (m.mediaType) cleanMsg.mediaType = m.mediaType;
            if (m.fileName) cleanMsg.fileName = m.fileName;
            if (m.type) cleanMsg.type = m.type;
            return cleanMsg;
          }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCurrentSessionId(docRef.id);
      }
    } catch (error) {
      console.error("Error saving chat session:", error);
    }
  };

  const saveToLibrary = (item: any, section: 'videos' | 'designs' | 'responses' | 'files') => {
    setLibrary(prev => ({
      ...prev,
      [section]: [...prev[section], { ...item, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() }]
    }));
    toast.success(`${section === 'videos' ? 'Video' : section === 'designs' ? 'Dizayn' : section === 'responses' ? 'Javob' : 'Fayl'} saqlandi!`);
  };

  const processAICMD = async (msg: string) => {
    const text = msg.toLowerCase();
    
    if (text.includes('video') && (text.includes('yarat') || text.includes('generate'))) {
      const prompt = msg.replace(/video yarat|generate video/gi, '').trim() || 'Modern gate opening animation';
      setMessages(prev => [...prev, { role: 'ai', text: `Tushunardim! Video yaratish uchun menga promt bering yoki men "${prompt}" asosida yaratishni boshlaymi?` }]);
      return true;
    }

    if (text.includes('saqla') || text.includes('save')) {
      setMessages(prev => [...prev, { role: 'ai', text: "Qaysi bo'limga saqlashni xohlaysiz? (Video, Dizayn, Javob yoki Fayl)" }]);
      return true;
    }
    
    return false;
  };

  const generateAIVideo = async (prompt: string) => {
    setIsProcessingMedia(true);
    const toastId = toast.loading("AI video yaratmoqda (bu bir necha daqiqa vaqt olishi mumkin)...");
    
    try {
      await new Promise(r => setTimeout(r, 4000));
      const mockVideo = "https://www.w3schools.com/html/mov_bbb.mp4"; 
      
      const newMsg = {
        role: 'ai',
        text: `Mana siz so'ragan video: "${prompt}"`,
        video: mockVideo
      };
      setMessages(prev => [...prev, newMsg]);
      saveToLibrary({ url: mockVideo, prompt }, 'videos');
      return mockVideo;
    } catch (error) {
      toast.error("Video yaratishda xatolik");
      return null;
    } finally {
      setIsProcessingMedia(false);
      toast.dismiss(toastId);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedImage && !attachedFile) || chatLoading) return;

    const userMsg = input.trim();
    if (userMsg) {
      const handled = await processAICMD(userMsg);
      if (handled) {
        setInput('');
        return;
      }
    }

    const currentImage = attachedImage;
    const currentMimeType = attachedMimeType;
    const currentFile = attachedFile;
    
    setInput('');
    setAttachedImage(null);
    setAttachedMimeType(null);
    setAttachedFile(null);
    
    const newMessages = [...messages, { 
      role: 'user', 
      text: userMsg, 
      ...(currentImage && { image: currentImage }),
      ...(currentFile?.url && { mediaUrl: currentFile.url }),
      ...(currentFile?.name && { fileName: currentFile.name }),
      ...(currentFile && { type: 'file' })
    }];

    if (currentFile) {
      saveToLibrary({ url: currentFile.url, name: currentFile.name, type: currentFile.type }, 'files');
    }

    setMessages(newMessages);
    setChatLoading(true);

    try {
      let aiResponse = '';
      let aiImage = undefined;

      const isImageRequest = (msg: string) => {
        const lower = msg.toLowerCase();
        return lower.includes('rasm yarat') || 
               lower.includes('dizayn yarat') || 
               lower.includes('rasm yartib ber') ||
               lower.includes('kartinka') ||
               lower.includes('create image') ||
               lower.includes('draw') ||
               lower.includes('chizib ber') ||
               lower.includes('yasab ber');
      };

      if (isImageRequest(userMsg)) {
        const prompt = userMsg.replace(/rasm yarat|dizayn yarat|rasm yartib ber|kartinka|create image|draw|chizib ber|yasab ber/gi, '').trim();
        const genPrompt = prompt || 'modern luxury gate design, realistic, high quality';
        
        try {
          const generatedImage = await generateAIImage(genPrompt);
          if (generatedImage) {
            aiResponse = `Mana siz so'ragan dizayn: "${genPrompt}".`;
            aiImage = generatedImage;
          } else {
            aiResponse = "Kechirasiz, rasm yaratishda xatolik yuz berdi.";
          }
        } catch (err) {
          aiResponse = "Rasm yaratishda xatolik yuz berdi.";
        }
      } else if (userMsg.toLowerCase().includes('video yarat') || userMsg.toLowerCase().includes('video tayyorla')) {
        const prompt = userMsg.replace(/video yarat|video tayyorla/gi, '').trim();
        const toastId = toast.loading("AI video yaratmoqda...");
        try {
          const generatedVideo = await generateAIVideo(prompt || 'modern gate opening animation');
          if (generatedVideo) {
            aiResponse = `Mana siz so'ragan video: "${prompt || 'Zamonaviy darvoza animatsiyasi'}".`;
            const videoMsg = { role: 'ai', text: aiResponse, mediaUrl: generatedVideo, mediaType: 'video' };
            const updatedMessages = [...newMessages, videoMsg];
            setMessages(updatedMessages);
            saveChatSession(updatedMessages);
            toast.success("Video tayyor!");
          } else {
            aiResponse = "Kechirasiz, video yaratishda xatolik yuz berdi.";
          }
        } finally {
          toast.dismiss(toastId);
        }
        return;
      } else {
        const fileData = currentImage || currentFile?.url;
        const base64Data = fileData ? fileData.split(',')[1] : undefined;
        const mimeType = currentImage ? currentMimeType || 'image/jpeg' : currentFile?.type;
        
        aiResponse = await getChatResponse(userMsg, base64Data, mimeType || undefined);
      }

      const finalMessages = [...newMessages, { 
        role: 'ai', 
        text: aiResponse,
        ...(aiImage && { image: aiImage })
      }];
      if (!aiImage && aiResponse) {
        // Auto-save responses to library if they look long/valuable
        if (aiResponse.length > 50) {
          saveToLibrary({ text: aiResponse }, 'responses');
        }
      }
      setMessages(finalMessages);
      saveChatSession(finalMessages);
    } catch (error) {
      toast.error("AI javob berishda xatolik yuz berdi.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateDesign = async () => {
    if (!designBackground || !designProduct) {
      toast.error("Orqa fon va mahsulot rasmini yuklang");
      return;
    }

    setIsGeneratingDesign(true);
    const toastId = toast.loading("AI dizaynni yaratmoqda...");

    try {
      const prompt = designPrompt.trim() || "Ushbu mahsulotni berilgan orqa fonga juda chiroyli va realistik tarzda joylashtirib, yangi dizayn yaratib ber. Ranglar va yorug'lik mos tushsin.";
      
      const generatedImage = await generateAIImage(prompt, designBackground, designProduct);
      
      if (generatedImage) {
        setGeneratedDesign(generatedImage);
        toast.success("Dizayn muvaffaqiyatli yaratildi!");
      } else {
        // Fallback to overlay method if AI generation fails
        const processedProduct = await removeBackgroundUtil(designProduct);
        const newOverlay: Overlay = {
          id: 'generated-' + Date.now(),
          imageUrl: processedProduct,
          name: "AI Dizayn",
          position: { x: 50, y: 50 },
          scale: 1.2,
          rotation: 0,
          rotation3D: { x: 0, y: 0, z: 0 },
          opacity: 1
        };
        setOverlays([newOverlay]);
        setBackgroundImage(designBackground);
        setActiveOverlayId(newOverlay.id);
        toast.success("Dizayn elementlari tayyorlandi (AI generation fallback)");
      }
    } catch (error) {
      toast.error("Dizayn yaratishda xatolik");
    } finally {
      setIsGeneratingDesign(false);
      toast.dismiss(toastId);
    }
  };
  const handleCustomDesignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setCustomDesignImage(base64);
        setIsRemovingBg(true);
        try {
          const processed = await removeBackgroundUtil(base64);
          const newOverlay: Overlay = {
            id: Math.random().toString(36).substr(2, 9),
            imageUrl: processed,
            name: "Sizning dizayningiz",
            position: { x: 50, y: 50 },
            scale: 1,
            rotation: 0,
            rotation3D: { x: 0, y: 0, z: 0 },
            opacity: 0.8
          };
          setOverlays(prev => [...prev, newOverlay]);
          setActiveOverlayId(newOverlay.id);
          toast.success("AI orqa fonni kesib tashladi!");
        } catch (error) {
          const newOverlay: Overlay = {
            id: Math.random().toString(36).substr(2, 9),
            imageUrl: base64,
            name: "Sizning dizayningiz",
            position: { x: 50, y: 50 },
            scale: 1,
            rotation: 0,
            rotation3D: { x: 0, y: 0, z: 0 },
            opacity: 0.8
          };
          setOverlays(prev => [...prev, newOverlay]);
          setActiveOverlayId(newOverlay.id);
        } finally {
          setIsRemovingBg(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || !activeOverlayId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setOverlays(prev => prev.map(o => 
      o.id === activeOverlayId 
        ? { ...o, position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } }
        : o
    ));
  };

  const activeOverlay = overlays.find(o => o.id === activeOverlayId);

  return (
    <div className={`mx-auto h-full flex flex-col transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-white max-w-none m-0' : 'max-w-6xl -mt-4 sm:mt-0'}`}>
      <div className={`hidden sm:flex flex-col gap-2 mb-4 px-4 lg:px-0 ${isFullScreen ? 'p-6 border-b border-gold/10' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black italic tracking-tighter text-gray-900 flex items-center gap-3 uppercase">
            <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center shadow-[0_5px_0_#b8860b] text-white">
              <Sparkles className="w-7 h-7" />
            </div>
            Svark AI
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="rounded-2xl w-12 h-12 hover:bg-gold/5 text-gold transition-all active:scale-95"
          >
            {isFullScreen ? <X className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </Button>
        </div>
        {!isFullScreen && <p className="text-gold/60 font-medium uppercase tracking-widest text-[10px]">AI yordamida premium dizaynlar yarating.</p>}
      </div>

      <Tabs defaultValue="chat" className="w-full flex-1 flex flex-col">
        <div className="px-0 sm:px-4 lg:px-0">
          <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1.5 rounded-none sm:rounded-[2rem] mb-0 sm:mb-8 border border-gold/10 shadow-sm">
            <TabsTrigger value="chat" className="rounded-none sm:rounded-[1.5rem] py-4 sm:py-5 gap-3 data-[state=active]:bg-gold data-[state=active]:shadow-lg data-[state=active]:text-white font-black text-xs sm:text-sm uppercase tracking-widest transition-all text-gray-400">
              <MessageSquare className="w-5 h-5" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="camera" className="rounded-none sm:rounded-[1.5rem] py-4 sm:py-5 gap-3 data-[state=active]:bg-gold data-[state=active]:shadow-lg data-[state=active]:text-white font-black text-xs sm:text-sm uppercase tracking-widest transition-all text-gray-400">
              <Camera className="w-5 h-5" />
              Virtual Sinov
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className={`mt-0 relative flex-1 flex flex-col min-h-0 ${isFullScreen ? 'h-full' : 'h-[calc(100vh-280px)] sm:h-[calc(100vh-320px)]'}`}>
          <Card className={`flex-1 flex flex-col border-none ${isFullScreen ? 'rounded-none shadow-none w-full h-full' : 'shadow-none sm:shadow-2xl rounded-none sm:rounded-3xl'} overflow-hidden bg-white relative`}>
            <CardHeader className="border-b bg-white backdrop-blur-xl sticky top-0 z-20 flex flex-row items-center justify-between py-4 px-6 rounded-t-3xl h-20 shrink-0 border-gold/10">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="rounded-2xl hover:bg-gold/5 transition-colors text-gold"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-6 h-6 text-gold animate-pulse" />
                    Svark AI
                  </CardTitle>
                  <p className="text-[10px] text-gold/60 font-bold uppercase tracking-widest leading-none">Premium Assistant</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startNewChat}
                className="rounded-2xl border-gold/20 text-gold hover:bg-gold/5 gap-2 h-10 px-4 font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Yangi chat
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative bg-white">
              {/* History Sidebar */}
              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ x: -400 }}
                    animate={{ x: 0 }}
                    exit={{ x: -400 }}
                    className="absolute inset-y-0 left-0 w-72 sm:w-80 bg-white border-r border-gold/10 z-40 shadow-2xl flex flex-col"
                  >
                    <div className="p-4 border-b border-gold/10 flex items-center justify-between bg-white">
                      <h4 className="font-bold flex items-center gap-2 text-gray-900">
                        <History className="w-4 h-4 text-gold" /> Tarix
                      </h4>
                      <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)} className="text-gold">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 p-2 bg-gray-50/50">
                      <div className="space-y-1">
                        {chatHistory.map((session) => (
                          <div key={session.id} className="group relative">
                            <button
                              onClick={() => loadChatSession(session)}
                              className={`w-full text-left p-3 rounded-xl text-sm transition-all pr-10 ${
                                currentSessionId === session.id ? 'bg-gold text-white shadow-md' : 'hover:bg-gold/5 text-gray-700'
                              }`}
                            >
                              <p className="font-medium truncate">{session.title}</p>
                              <p className={`text-[10px] ${currentSessionId === session.id ? 'text-white/80' : 'text-gold/40'}`}>
                                {session.updatedAt?.toDate().toLocaleDateString()}
                              </p>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChatSession(session.id);
                              }}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${currentSessionId === session.id ? 'text-white/60 hover:text-white' : 'text-gold/40 hover:text-red-500'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 relative min-h-0 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4 sm:p-6 space-y-4">
                    <div ref={chatTopRef} />
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                        {msg.role === 'ai' && (
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-lg mt-1">
                            <Sparkles className="w-5 h-5 text-gold" />
                          </div>
                        )}
                        <div className={`max-w-[80%] p-5 rounded-[1.5rem] ${
                          msg.role === 'user' 
                            ? 'bg-gold text-white rounded-tr-none shadow-xl shadow-gold/10' 
                            : 'bg-white text-gray-900 rounded-tl-none border border-gold/5 shadow-xl shadow-gold/5'
                        }`}>
                          {msg.image && (
                            <div className="mb-4 rounded-2xl overflow-hidden shadow-2xl border border-gold/10">
                              <img src={msg.image} alt="AI Content" className="w-full h-auto" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          {msg.mediaUrl && (
                            <div className="mb-4 rounded-2xl overflow-hidden shadow-2xl border border-gold/10 bg-black">
                              {msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="Media" className="w-full h-auto" referrerPolicy="no-referrer" />}
                              {msg.mediaType === 'voice' && <audio src={msg.mediaUrl} controls className="w-full h-10 brightness-90 contrast-125" />}
                              {msg.mediaType === 'video' && (
                                <VideoMessage src={msg.mediaUrl!} />
                              )}
                              {msg.mediaType === 'round_video' && (
                                <div className="w-48 h-48 rounded-full overflow-hidden mx-auto border-4 border-white/20">
                                  <video src={msg.mediaUrl} controls className="w-full h-full object-cover" />
                                </div>
                              )}
                              {msg.type === 'file' && (
                                <div className="flex items-center gap-4 p-4 bg-black rounded-2xl border border-gold/20">
                                  <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
                                    <FileText className="w-7 h-7 text-gold" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate text-white uppercase tracking-widest italic">{msg.fileName || 'Fayl'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Svark AI Hujjati</p>
                                  </div>
                                  <a href={msg.mediaUrl} download={msg.fileName} className="p-2.5 bg-white/5 hover:bg-gold hover:text-black rounded-xl transition-all text-white">
                                    <Download className="w-5 h-5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap italic">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gold/10 mt-1">
                            <User className="w-5 h-5 text-gold/40" />
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-lg">
                          <RefreshCw className="w-5 h-5 text-gold animate-spin" />
                        </div>
                        <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none border border-gold/5 shadow-xl shadow-gold/5">
                          <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </ScrollArea>
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg opacity-80 hover:opacity-100 bg-white border border-gold/10 hover:border-gold/30 transition-all"
                    onClick={() => chatTopRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    title="Tepaga"
                  >
                    <ArrowUp className="w-4 h-4 text-gold" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg opacity-80 hover:opacity-100 bg-white border border-gold/10 hover:border-gold/30 transition-all"
                    onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    title="Pastga"
                  >
                    <ArrowDown className="w-4 h-4 text-gold" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border-t bg-gray-50 space-y-4 relative">
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-full left-4 right-4 mb-4 bg-gray-900 text-white p-6 rounded-3xl flex flex-col items-center gap-4 z-50 shadow-2xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-bold tracking-widest">Yozib olinmoqda...</span>
                      </div>
                      {recordingType !== 'voice' && (
                        <div className={`relative overflow-hidden border-4 border-white/20 shadow-2xl ${recordingType === 'round_video' ? 'w-64 h-64 rounded-full' : 'w-full max-w-sm aspect-video rounded-2xl'}`}>
                          <video ref={chatVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                          <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">REC</div>
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

                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar py-2 px-1">
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.95, translateY: 0 }}
                    type="button"
                    onClick={() => setInput("Zamonaviy darvoza dizaynini yaratib ber")}
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-black border border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gold/5 active:translate-y-[4px] transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    Rasm yaratish
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.95, translateY: 0 }}
                    type="button"
                    onClick={() => setInput("Ushbu dizayn haqida tushuntirish ber")}
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-black border border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gold/5 active:translate-y-[4px] transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    AI Tahlil
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.95, translateY: 0 }}
                    type="button"
                    onClick={() => setInput("Narxlarni hisoblab ber")}
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-black border border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gold/5 active:translate-y-[4px] transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center shadow-inner">
                      <Calculator className="w-5 h-5" />
                    </div>
                    Narxni hisoblash
                  </motion.button>
                </div>
                {attachedImage && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gold/40">
                    <img src={attachedImage} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {attachedFile && (
                  <div className="relative w-full max-w-[200px] p-3 rounded-xl bg-gold/5 border border-gold/10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate text-gray-900 italic uppercase tracking-tighter">{attachedFile.name}</p>
                      <p className="text-[10px] text-gold/40 font-bold uppercase tracking-widest">Yuklangan fayl</p>
                    </div>
                    <button 
                      onClick={() => setAttachedFile(null)}
                      className="bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-3xl border border-gray-100">
                  <div className="flex gap-1 pl-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="rounded-xl w-10 h-10 hover:bg-white hover:shadow-sm text-black transition-all"
                      title="Fayl yuklash (PDF, CAD)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => chatImageInputRef.current?.click()}
                      className="rounded-xl w-10 h-10 hover:bg-white hover:shadow-sm text-black transition-all"
                      title="Rasm yuklash"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </Button>
                  </div>
                  <input 
                    type="file" 
                    ref={chatImageInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleChatImageUpload} 
                  />
                  <input 
                    type="file" 
                    ref={chatFileInputRef} 
                    className="hidden" 
                    accept=".pdf,.dwg,.dxf,.zip"
                    onChange={handleChatFileUpload} 
                  />
                  <div className="flex-1 relative group">
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(new Event('submit') as any);
                        }
                      }}
                      placeholder="AI ga savol bering..."
                      className="w-full rounded-[1.5rem] py-8 bg-white border-gold/10 focus-visible:ring-gold/20 shadow-xl shadow-gold/5 px-6 font-medium italic"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                       <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => startRecording('video')}
                        className={`w-10 h-10 rounded-xl hover:bg-gold/10 hover:text-gold transition-all ${isRecording && recordingType === 'video' ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={chatLoading || (!input.trim() && !attachedImage && !attachedFile)} 
                    type="submit"
                    className="bg-gold hover:bg-gold-light disabled:opacity-50 disabled:grayscale text-white rounded-[1.2rem] w-14 h-14 flex items-center justify-center shadow-xl shadow-gold/30 active:scale-95 transition-all"
                  >
                    <Send className="w-6 h-6 fill-current" />
                  </motion.button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="camera" className="mt-0 relative flex-1 flex flex-col min-h-0 h-full">
          <Card className={`flex-1 border-none ${isFullScreen ? 'rounded-none shadow-none' : 'shadow-none sm:shadow-2xl rounded-none sm:rounded-3xl'} overflow-hidden bg-white relative min-h-[calc(100vh-180px)] sm:min-h-[600px] flex flex-col`}>
            {!tryOnProduct && tryOnStep === 'product' ? (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-gray-900 leading-none">1. Mahsulotni tanlang</h3>
                  <p className="text-gold/60 text-sm font-medium">Sinab ko'rmoqchi bo'lgan darvoza yoki dizayningizni yuklang.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          setIsRemovingBg(true);
                          try {
                            const processed = await removeBackgroundUtil(base64);
                            setTryOnProduct(processed);
                            setTryOnStep('background');
                            toast.success("Mahsulot tayyor!");
                          } catch (err) {
                            setTryOnProduct(base64);
                            setTryOnStep('background');
                          } finally {
                            setIsRemovingBg(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <div className="h-44 rounded-[2.5rem] border-4 border-dashed border-gold/10 group-hover:border-gold/30 group-hover:bg-gold/5 transition-all flex flex-col items-center justify-center gap-3 bg-gray-50/50">
                      <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-white shadow-lg">
                        <Upload className="w-7 h-7" />
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-[0.2em] text-gold/60">Rasm yuklash</span>
                    </div>
                  </label>
                  
                  <div className="h-44 rounded-[2.5rem] border-4 border-gold/5 bg-gray-50 flex flex-col items-center justify-center gap-3 opacity-50 grayscale">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-gold/20 shadow-sm border border-gold/10">
                      <History className="w-7 h-7" />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-[0.2em] text-gold/20">Arxivdan tanlash</span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-[1px] flex-1 bg-gold/10" />
                    <p className="text-[10px] font-black text-gold/40 uppercase tracking-[0.2em]">Mavjud namunalar</p>
                    <div className="h-[1px] flex-1 bg-gold/10" />
                  </div>
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-3 gap-3 pb-20">
                      {products.slice(0, 9).map((p) => (
                        <button 
                          key={p.id}
                          onClick={async () => {
                            setIsRemovingBg(true);
                            try {
                              const processed = await removeBackgroundUtil(p.imageUrl);
                              setTryOnProduct(processed);
                              setTryOnStep('background');
                            } catch {
                              setTryOnProduct(p.imageUrl);
                              setTryOnStep('background');
                            } finally {
                              setIsRemovingBg(false);
                            }
                          }}
                          className="aspect-square rounded-[1.5rem] overflow-hidden border-2 border-transparent hover:border-gold transition-all relative group bg-gray-50 shadow-sm hover:shadow-md"
                        >
                          <img src={p.imageUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-all flex items-center justify-center">
                            <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : tryOnStep === 'background' ? (
              <div className="flex-1 flex flex-col p-6 space-y-8 items-center justify-center bg-gray-50/50">
                <Button 
                  variant="ghost" 
                  onClick={() => setTryOnStep('product')} 
                  className="absolute top-6 left-6 rounded-2xl text-gold hover:bg-gold/5 font-bold"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Ortga
                </Button>
                <div className="text-center space-y-3">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">2. Joyni tanlang</h3>
                  <p className="text-gold/60 text-sm font-medium">Mahsulotni qayerda ko'rmoqchisiz?</p>
                </div>

                <div className="flex flex-col gap-5 w-full max-w-sm">
                  <Button 
                    onClick={() => {
                      startCamera();
                      setTryOnStep('interactive');
                    }}
                    className="h-24 rounded-[2rem] bg-gold hover:bg-gold-light shadow-xl shadow-gold/20 flex items-center justify-start px-8 gap-6 group transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Camera className="w-7 h-7 text-white" /></div>
                    <div className="text-left">
                      <p className="font-black italic uppercase text-lg text-white leading-tight">Jonli Kamera</p>
                      <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Haqiqiy vaqtda sinash</p>
                    </div>
                  </Button>

                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBackgroundImage(reader.result as string);
                          setTryOnStep('interactive');
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <div className="h-24 rounded-[2rem] bg-white border border-gold/10 hover:border-gold/30 hover:bg-gold/5 transition-all flex items-center justify-start px-8 gap-6 group shadow-sm hover:shadow-md">
                      <div className="w-14 h-14 rounded-2xl bg-gold/5 flex items-center justify-center text-gold group-hover:scale-110 transition-transform"><ImageIcon className="w-7 h-7" /></div>
                      <div className="text-left">
                        <p className="font-black italic uppercase text-lg text-gray-900 leading-tight">Rasm yuklash</p>
                        <p className="text-[10px] text-gold/40 font-bold uppercase tracking-wider">Galereyadan tanlash</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div 
                ref={containerRef}
                className="relative flex-1 w-full bg-white overflow-hidden touch-none"
                onMouseMove={(e) => isDragging && handleMove(e.clientX, e.clientY)}
                onTouchMove={(e) => isDragging && handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onMouseUp={() => setIsDragging(false)}
                onTouchEnd={() => setIsDragging(false)}
              >
                {stream ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={backgroundImage!} className="w-full h-full object-cover shadow-inner" />
                )}

                {/* Overlay Product */}
                {tryOnProduct && (
                  <div 
                    className="absolute cursor-move select-none touch-none"
                    style={{
                      left: `${tryOnPos.x}%`,
                      top: `${tryOnPos.y}%`,
                      transform: `translate(-50%, -50%) rotate(${tryOnRotation}deg) scale(${tryOnScale})`,
                      opacity: opacity
                    }}
                    onMouseDown={() => setIsDragging(true)}
                    onTouchStart={() => setIsDragging(true)}
                  >
                    <img src={tryOnProduct} className="max-w-[400px] h-auto pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] filter contrast-125 saturate-125" />
                    {isDragging && <div className="absolute inset-0 border-4 border-gold border-dashed rounded-[2rem] animate-pulse" />}
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-white via-white/80 to-transparent flex flex-col gap-6">
                  {/* Tools */}
                  <div className="flex justify-between items-center bg-white/90 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-gold/10 shadow-2xl shadow-gold/10">
                    <div className="flex gap-2">
                       <Button size="icon" variant="ghost" onClick={() => setTryOnRotation(r => r - 15)} className="text-gold hover:bg-gold/10 rounded-2xl w-12 h-12 shadow-sm border border-gold/5">
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setTryOnRotation(r => r + 15)} className="text-gold hover:bg-gold/10 rounded-2xl w-12 h-12 shadow-sm border border-gold/5">
                        <RotateCcw className="w-5 h-5 transform scale-x-[-1]" />
                      </Button>
                    </div>

                    <div className="flex-1 px-8">
                       <Slider 
                        value={[tryOnScale * 100]} 
                        min={10} 
                        max={300} 
                        step={1} 
                        onValueChange={(v) => setTryOnScale(v[0] / 100)}
                        className="w-full"
                      />
                      <p className="text-[8px] font-black text-gold/40 uppercase tracking-[0.2em] text-center mt-2">O'lchamni sozlash</p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setTryOnProduct(null);
                          setTryOnStep('product');
                          stopCamera();
                          setBackgroundImage(null);
                        }} 
                        className="text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl w-12 h-12 shadow-sm border border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      {stream && (
                        <Button size="icon" variant="ghost" onClick={toggleCamera} className="text-gold bg-gold/5 hover:bg-gold/10 rounded-2xl w-12 h-12 shadow-sm border border-gold/10">
                          <RefreshCw className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={captureImage}
                      className="flex-1 bg-white text-gold border-2 border-gold/10 hover:bg-gold/5 rounded-[1.5rem] h-16 font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-gold/5"
                    >
                      <Download className="w-6 h-6 mr-2" /> Rasmga olish
                    </Button>
                    <Button 
                      onClick={getAiRecommendation}
                      disabled={isAiAnalyzing}
                      className="flex-1 bg-gold text-white hover:bg-gold-light rounded-[1.5rem] h-16 font-black italic uppercase tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all gap-2"
                    >
                      {isAiAnalyzing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                      AI Tavsiya
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="design" className="mt-0 flex-1 flex flex-col">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white flex-1 flex flex-col p-8">
            <div className="max-w-4xl mx-auto w-full space-y-12">
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-bold text-gray-900">AI Dizayn Generator</h3>
                <p className="text-gray-500">Orqa fon va mahsulotni yuklang, AI ularni birlashtirib beradi.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-gold uppercase tracking-[0.3em] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gold" /> Orqa fon (Uy, deraza, devor)
                  </Label>
                  <label className="block group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setDesignBackground(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <div className={`aspect-video rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative ${
                      designBackground ? 'border-gold bg-gold/5 shadow-inner' : 'border-gold/10 hover:border-gold/40 hover:bg-gold/5'
                    }`}>
                      {designBackground ? (
                        <>
                          <img src={designBackground} alt="Background" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gold/20 group-hover:text-gold transition-colors" />
                          <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest italic">Fon rasmini yuklang</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-gold uppercase tracking-[0.3em] flex items-center gap-2">
                    <Box className="w-5 h-5 text-gold" /> Mahsulot (Darvoza, reshotka)
                  </Label>
                  <label className="block group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setDesignProduct(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <div className={`aspect-video rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative ${
                      designProduct ? 'border-gold bg-gold/5 shadow-inner' : 'border-gold/10 hover:border-gold/40 hover:bg-gold/5'
                    }`}>
                      {designProduct ? (
                        <>
                          <img src={designProduct} alt="Product" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gold/20 group-hover:text-gold transition-colors" />
                          <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest italic">Mahsulot rasmini yuklang</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-gold uppercase tracking-[0.3em] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" /> Promt (AI ga nima yaratishni ayting)
                </Label>
                <div className="relative">
                  <Input 
                    value={designPrompt}
                    onChange={(e) => setDesignPrompt(e.target.value)}
                    placeholder="Masalan: Darvozani devorga mos tushadigan qilib, tilla rangli elementlar bilan joylashtir..."
                    className="rounded-[1.5rem] py-10 pl-6 pr-16 bg-gray-50 border-gold/10 focus:border-gold focus:ring-4 focus:ring-gold/10 transition-all text-lg font-medium italic"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-gold/5 rounded-xl">
                    <Sparkles className="w-6 h-6 text-gold" />
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <Button 
                  onClick={handleGenerateDesign}
                  disabled={isGeneratingDesign || !designBackground || !designProduct}
                  className="px-16 py-10 rounded-[2rem] bg-gold hover:bg-gold-light text-white shadow-2xl shadow-gold/20 gap-4 font-black italic uppercase tracking-widest text-xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  {isGeneratingDesign ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Sparkles className="w-8 h-8" />
                  )}
                  {isGeneratingDesign ? "Yaratilmoqda..." : "Dizaynni Yaratish"}
                </Button>
              </div>

              {generatedDesign && (
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-12 border-t"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-6 h-6 text-green-600" /> Natija
                    </h4>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedDesign;
                        link.download = `ai-design-${Date.now()}.png`;
                        link.click();
                      }}
                      className="rounded-2xl gap-2 font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Yuklab olish
                    </Button>
                  </div>
                  <div className="aspect-square sm:aspect-video rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-gray-100 bg-gray-50 group relative">
                    <img src={generatedDesign} alt="Generated Design" className="w-full h-full object-contain" />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-medium">AI tomonidan yaratilgan dizayn</p>
                      <p className="text-sm text-gray-300">Bu rasm orqa fon va mahsulot asosida generatsiya qilindi.</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setBackgroundImage(generatedDesign);
                        setOverlays([]);
                        toast.success("Dizayn vizualizatorga o'tkazildi!");
                      }}
                      className="rounded-2xl py-6 px-8 gap-2 border-2 hover:bg-gray-50"
                    >
                      <Box className="w-5 h-5" />
                      Vizualizatorga o'tkazish
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};
