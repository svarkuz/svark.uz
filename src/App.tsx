import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, setDoc, updateDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

import { Navbar } from '@/src/components/Navbar';
import { ProductList } from '@/src/components/ProductList';
import { MasterDashboard } from '@/src/components/MasterDashboard';
import { AdminDashboard } from '@/src/components/AdminDashboard';
import { Gallery } from '@/src/components/Gallery';
import { SvarkAI } from '@/src/components/SvarkAI';
import { WorkflowManager } from '@/src/components/WorkflowManager';
import { CustomerManager } from '@/src/components/CustomerManager';
import { AdminChat } from '@/src/components/AdminChat';
import { CraftsmanProfiles } from '@/src/components/CraftsmanProfiles';
import { NotificationsList } from '@/src/components/NotificationsList';
import { ProfileSetup } from '@/src/components/ProfileSetup';
import { ProfileSettings } from '@/src/components/ProfileSettings';
import { VirtualTryOn } from '@/src/components/VirtualTryOn';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, ClipboardList, Settings, Camera, Sparkles, MessageSquare, Bell, Send, Instagram, Briefcase, Shield, User, Layers, Users, ShoppingCart, Trash2, Plus, Minus, Check, Menu, X, History, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [initialChatUserId, setInitialChatUserId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item);
      }
      toast.success(`${product.name} savatga qo'shildi!`);
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    toast.success("Mahsulot savatdan olindi");
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };
  const [socialLinks, setSocialLinks] = useState<any>({ telegram: 'https://t.me/svark_uz', instagram: 'https://www.instagram.com/svark_uz?igsh=MW0xNHdqeThlaHRsOA==' });

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const updateHeartbeat = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastActive: serverTimestamp(),
            isOnline: true
          });
        } catch (e) {
          console.error("Heartbeat error:", e);
        }
      };

      updateHeartbeat();
      const interval = setInterval(updateHeartbeat, 60000); // Every minute
      
      const handleTabClose = () => {
        // We can't use async in beforeunload reliably, but we can try
        updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastActive: serverTimestamp()
        });
      };
      
      window.addEventListener('beforeunload', handleTabClose);
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleTabClose);
      };
    }
  }, [user?.uid]);

  useEffect(() => {
    const unsubSocial = onSnapshot(doc(db, 'settings', 'social'), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });
    return () => unsubSocial();
  }, []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnProductImage, setTryOnProductImage] = useState<string | null>(null);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [isWorkerSession, setIsWorkerSession] = useState(() => {
    return localStorage.getItem('workerSession') === 'true';
  });
  const [isCustomerSession, setIsCustomerSession] = useState(() => {
    return localStorage.getItem('customerSession') === 'true';
  });
  const [localCustomerData, setLocalCustomerData] = useState<any>(() => {
    const data = localStorage.getItem('customerData');
    return data ? JSON.parse(data) : null;
  });

  useEffect(() => {
    // Seed sample craftsmen and products if empty
    const seedInitialData = async () => {
      const { getDocs, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Seed Craftsmen
      const craftsmenSnapshot = await getDocs(collection(db, 'craftsmen'));
      if (craftsmenSnapshot.empty) {
        const samples = [
          {
            name: "Umidjon Usta",
            bio: "8 yillik tajribaga ega professional svarkachi. Darvoza va reshotkalar bo'yicha mutaxassis. Sifat va tezlik kafolati.",
            specialties: ["Darvozalar", "Reshotkalar", "Svarka"],
            rating: 4.9,
            reviewCount: 12,
            imageUrl: "https://picsum.photos/seed/umid/400/400",
            portfolio: [
              "https://picsum.photos/seed/p1/800/600",
              "https://picsum.photos/seed/p2/800/600",
              "https://picsum.photos/seed/p3/800/600"
            ]
          }
        ];
        for (const s of samples) {
          await addDoc(collection(db, 'craftsmen'), { ...s, createdAt: serverTimestamp() });
        }
      }

      // Seed Products from Gallery Images
      const productsSnapshot = await getDocs(collection(db, 'products'));
      if (productsSnapshot.empty) {
        const productSamples = [
          {
            name: "Modern Darvoza",
            description: "YUqori sifatli metalldan tayyorlangan zamonaviy darvoza.",
            pricePerSqM: 850000,
            category: "gate",
            imageUrl: "https://i.ibb.co/9QV5Ytc/2d4685cb-cefa-4883-9cdf-61b85a6ca52d.png"
          },
          {
            name: "To'pli pol (Santexnik)",
            description: "Santexnika va to'pli pol tizimlarini o'rnatish.",
            pricePerSqM: 45000,
            category: "railing",
            imageUrl: "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg"
          },
          {
            name: "Badiiy Reshotka",
            description: "Derazalar uchun mustahkam va chiroyli reshotkalar.",
            pricePerSqM: 450000,
            category: "decorative",
            imageUrl: "https://i.ibb.co/hFzT9dLT/61fb16de-275c-4010-aeb4-e9a747d4f967.png"
          },
          {
            name: "Klassik Naves",
            description: "Hovli uchun mustahkam va chiroyli klassik naves.",
            pricePerSqM: 600000,
            category: "naves",
            imageUrl: "https://i.ibb.co/20PT75w1/b4d3cf6e-8066-40e1-a310-53c7c5c00a07.jpg"
          },
          {
            name: "Polikarbonat Naves",
            description: "YUqori sifatli polikarbonatdan tayyorlangan naves.",
            pricePerSqM: 550000,
            category: "naves",
            imageUrl: "https://i.ibb.co/hRdR75PG/photo-2026-04-10-19-55-26.jpg"
          },
          {
            name: "Zamonaviy Naves",
            description: "Minimalistik dizayndagi zamonaviy naves.",
            pricePerSqM: 700000,
            category: "naves",
            imageUrl: "https://i.ibb.co/svSmNKjh/photo-2026-03-17-15-45-02.jpg"
          },
          {
            name: "Katta Naves Majmuasi",
            description: "Katta hududlar uchun mo'ljallangan murakkab naveslar tizimi.",
            pricePerSqM: 650000,
            category: "naves",
            imageUrl: "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg"
          }
        ];
        for (const p of productSamples) {
          await addDoc(collection(db, 'products'), { ...p, createdAt: serverTimestamp() });
        }
      }
    };
    seedInitialData();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        if (!isWorkerSession && !isCustomerSession) setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [isWorkerSession, isCustomerSession]);

  useEffect(() => {
    const profileUid = user?.uid || localCustomerData?.uid;
    if (profileUid) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', profileUid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);
          // Sync back to local storage if it's a customer session
          if (isCustomerSession && profileUid === localCustomerData?.uid) {
            setLocalCustomerData(data);
            localStorage.setItem('customerData', JSON.stringify(data));
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Profile listener error:", error);
        setLoading(false);
      });
      return () => unsubscribeProfile();
    } else if (isWorkerSession || isCustomerSession) {
      setLoading(false);
    }
  }, [user, isWorkerSession, isCustomerSession, localCustomerData?.uid]);

  const handleWorkerLogin = (isWorker: boolean) => {
    setIsWorkerSession(isWorker);
    if (isWorker) {
      localStorage.setItem('workerSession', 'true');
    } else {
      localStorage.removeItem('workerSession');
    }
  };

  const handleCustomerLogin = async (data: any) => {
    if (data) {
      setIsCustomerSession(true);
      setLocalCustomerData(data);
      localStorage.setItem('customerSession', 'true');
      localStorage.setItem('customerData', JSON.stringify(data));
      
      // Create user doc in Firestore for chat visibility
      try {
        await setDoc(doc(db, 'users', data.uid), {
          uid: data.uid,
          displayName: data.displayName,
          phone: data.phone,
          role: 'customer',
          profileComplete: true,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error("Error creating customer user doc:", error);
      }
    } else {
      setIsCustomerSession(false);
      setLocalCustomerData(null);
      localStorage.removeItem('customerSession');
      localStorage.removeItem('customerData');
    }
  };

  const isAdminOrWorker = isWorkerSession || 
    userProfile?.role === 'admin' || 
    (user?.email === 'kidsafeuzb@gmail.com' && user?.emailVerified);
  
  const effectiveUser = user || 
    (isWorkerSession ? { uid: 'worker_session', displayName: 'Umid (Ishchi)', role: 'master' } : 
    (isCustomerSession ? { uid: localCustomerData?.uid, displayName: localCustomerData?.displayName, isLocal: true } : null));
  const effectiveProfile = userProfile || 
    (isWorkerSession ? { role: 'master', displayName: 'Umid (Ishchi)' } : 
    (isCustomerSession ? localCustomerData : null));

  useEffect(() => {
    if (effectiveUser && effectiveUser.uid) {
      const targetIds = [effectiveUser.uid].filter(Boolean);
      if (isAdminOrWorker) {
        targetIds.push('admin_broadcast');
      }
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', 'in', targetIds),
        where('read', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      }, (error) => {
        console.error("Notifications unread count error:", error);
      });
      return () => unsubscribe();
    }
  }, [effectiveUser, isAdminOrWorker]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const needsProfileSetup = user && userProfile && userProfile.profileComplete === false && !isWorkerSession && !isCustomerSession;

  return (
    <ErrorBoundary>
      {/* AI Advisor Floating Button */}
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setActiveTab('svark-ai');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 cursor-pointer group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles className="w-8 h-8 relative z-10" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">
          AI YORDAMCHI
        </div>
      </motion.button>

      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
        <Navbar 
          user={effectiveUser} 
          userProfile={effectiveProfile} 
          unreadCount={unreadCount}
          onWorkerLogin={handleWorkerLogin}
          onCustomerLogin={handleCustomerLogin}
          isWorkerSession={isWorkerSession}
          isCustomerSession={isCustomerSession}
        />
        
        <main className={`flex-1 w-full mx-auto ${
          (activeTab === 'svark-ai' || activeTab === 'chat') 
            ? 'max-w-none px-0 sm:px-0 lg:px-0 py-0 sm:py-0 pb-24 sm:pb-0 h-full' 
            : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8'
        }`}>
          {needsProfileSetup ? (
            <ProfileSetup user={user} onComplete={() => {
              if (userProfile) {
                setUserProfile({ ...userProfile, profileComplete: true });
              }
            }} />
          ) : !effectiveUser && !isWorkerSession ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* Hero Section */}
              <div className="w-full py-12 sm:py-24 flex flex-col items-center text-center px-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 mb-8 relative"
                >
                  <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse" />
                  <img 
                    src="https://i.ibb.co/rGStjV9t/photo-2026-04-19-13-06-56.jpg" 
                    alt="svark_uz logo" 
                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl relative z-10 border-4 border-white"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl sm:text-7xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]"
                >
                  Sizning uyingiz uchun <br />
                  <span className="text-blue-600">mukammal</span> temir ishlar
                </motion.h1>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg sm:text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed"
                >
                  Zamonaviy darvozalar, reshotkalar va badiiy svarka ishlari. 
                  AI yordamida dizayn tanlang va professional ustaga buyurtma bering.
                </motion.p>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
                >
                  <Button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-login-modal'));
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-8 rounded-2xl font-bold text-xl shadow-2xl shadow-blue-200 w-full group transition-all"
                  >
                    Kirish (Login)
                    <User className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                  </Button>
                </motion.div>
              </div>

              {/* Featured Master Section */}
              <div className="w-full max-w-5xl px-4 py-16">
                <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-xl border border-gray-100 flex flex-col lg:flex-row items-center gap-12">
                  <div className="w-full lg:w-1/2 space-y-6">
                    <Badge className="bg-blue-50 text-blue-600 border-none px-4 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">
                      Bosh usta
                    </Badge>
                    <h2 className="text-4xl font-black text-gray-900">Umidjon Usta</h2>
                    <p className="text-gray-500 text-lg leading-relaxed">
                      Professional svarkachi, Toshkent shahar bo'ylab xizmat ko'rsataman.
                      Darvoza va reshotkalar bo'yicha mutaxassis. 
                      Har bir ishga individual yondashuv va sifat kafolati.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {["Darvozalar", "Reshotkalar", "Santexnik", "Sifat kafolati"].map((tag) => (
                        <span key={tag} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {/* Social Links for Guest View */}
                    <div className="flex items-center gap-4 pt-2">
                       <a href="https://t.me/svark_uz" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#229ED9]/10 text-[#229ED9] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#229ED9]/20 transition-colors">
                         <History className="w-4 h-4" /> Telegram
                       </a>
                       <a href="https://instagram.com/svark_uz" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#E4405F]/10 text-[#E4405F] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#E4405F]/20 transition-colors">
                         <Star className="w-4 h-4" /> Instagram
                       </a>
                    </div>
                    <div className="pt-4 flex items-center gap-8">
                      <div>
                        <p className="text-3xl font-black text-gray-900">4.9</p>
                        <p className="text-xs text-gray-400 font-bold uppercase">Reyting</p>
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">4000</p>
                        <p className="text-xs text-gray-400 font-bold uppercase">Ishlar</p>
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">100%</p>
                        <p className="text-xs text-gray-400 font-bold uppercase">Mamnuniyat</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/2 relative">
                    <div className="absolute -inset-4 bg-blue-600/5 rounded-[2.5rem] blur-xl" />
                    <div className="w-full aspect-square bg-gray-100 rounded-[2.5rem] shadow-2xl relative z-10 flex items-center justify-center border-4 border-white">
                      <User className="w-32 h-32 text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-6xl px-4 py-12">
                {[
                  { title: "Tezkor buyurtma", desc: "O'lchamlarni kiriting va narxni darhol biling", icon: <ClipboardList className="w-6 h-6 text-blue-600" /> },
                  { title: "Sifat kafolati", desc: "Faqat eng yaxshi materiallardan tayyorlangan", icon: <Shield className="w-6 h-6 text-blue-600" /> },
                  { title: "Doimiy aloqa", desc: "Buyurtma holatini real vaqtda kuzating", icon: <MessageSquare className="w-6 h-6 text-blue-600" /> }
                ].map((feature, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -5 }}
                    className="p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-blue-100"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <Tabs 
              value={activeTab || (isAdminOrWorker ? "admin" : "catalog")} 
              onValueChange={setActiveTab}
              className="space-y-6 sm:space-y-8"
            >
              <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                  <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-max min-w-full">
                  {!isAdminOrWorker && (
                    <TabsTrigger value="catalog" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        {effectiveUser && !isAdminOrWorker ? 'Buyurtma berish' : 'Katalog'}
                      </div>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="gallery" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Ish jarayonlari
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="svark-ai" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Svark AI
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all relative">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </div>
                  </TabsTrigger>
                  {effectiveUser && (
                    <TabsTrigger value="notifications" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all relative">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Bildirishnomalar
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                          {unreadCount}
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                  {effectiveUser && !isAdminOrWorker && (
                    <TabsTrigger value="my-orders" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Buyurtmalarim
                      </div>
                    </TabsTrigger>
                  )}
                  {effectiveUser && (
                    <TabsTrigger value="profile-settings" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profil
                      </div>
                    </TabsTrigger>
                  )}
                  {isAdminOrWorker && (
                    <TabsTrigger value="admin" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Ishchi Paneli
                      </div>
                    </TabsTrigger>
                  )}
                </TabsList>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCartOpen(true)}
                  className="relative rounded-2xl hover:bg-gray-100 h-14 w-14 border border-gray-100 shadow-sm ml-2"
                >
                  <ShoppingCart className="w-6 h-6 text-gray-700" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                      {cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0)}
                    </span>
                  )}
                </Button>
              </div>

              {/* Mobile Bottom Navigation - Scrollable for many items */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-50 flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto scrollbar-hide gap-6">
                {!isAdminOrWorker && (
                  <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'catalog' ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <LayoutGrid className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Katalog</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('svark-ai')}
                  className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'svark-ai' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-[10px] font-bold">AI</span>
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'chat' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-[10px] font-bold">Chat</span>
                </button>
                {effectiveUser && (
                  <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative ${activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Bell className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Xabarlar</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
                {effectiveUser && isAdminOrWorker && (
                  <button 
                    onClick={() => setActiveTab('workflows')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'workflows' ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Layers className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Jarayon</span>
                  </button>
                )}
                {isAdminOrWorker && (
                  <button 
                    onClick={() => setActiveTab('customers')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'customers' ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Mijozlar</span>
                  </button>
                )}
                {isAdminOrWorker ? (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'admin' ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Panel</span>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setActiveTab('my-orders')}
                      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'my-orders' ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <ClipboardList className="w-6 h-6" />
                      <span className="text-[10px] font-bold">Buyurtma</span>
                    </button>
                    {effectiveUser && (
                      <button 
                        onClick={() => setActiveTab('profile-settings')}
                        className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'profile-settings' ? 'text-blue-600' : 'text-gray-400'}`}
                      >
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-bold">Profil</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setIsCartOpen(true)}
                      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative ${isCartOpen ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        {cartItems.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white px-0.5">
                            {cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold">Savat</span>
                    </button>
                  </>
                )}
              </div>

              <AnimatePresence mode="wait">
                <TabsContent value="catalog" key="catalog-content">
                  <motion.div
                    key="catalog-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <ProductList 
                      user={effectiveUser} 
                      onOpenAI={() => setActiveTab('svark-ai')} 
                      onOpenTryOn={(imageUrl) => {
                        setTryOnProductImage(imageUrl);
                        setTryOnOpen(true);
                      }}
                      searchQuery={searchQuery}
                      addToCart={addToCart}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="gallery" key="gallery-content">
                  <motion.div
                    key="gallery-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Gallery user={effectiveUser} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="workflows" key="workflows-content">
                  <motion.div
                    key="workflows-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <WorkflowManager user={effectiveUser} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="customers" key="customers-content">
                  <motion.div
                    key="customers-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <CustomerManager />
                  </motion.div>
                </TabsContent>

                <TabsContent value="svark-ai" key="svark-ai-content">
                  <motion.div
                    key="svark-ai-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <SvarkAI user={effectiveUser} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="chat" key="chat-content">
                  <motion.div
                    key="chat-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <AdminChat 
                      user={effectiveUser} 
                      isAdmin={isAdminOrWorker} 
                      initialChatUserId={initialChatUserId}
                      onChatOpened={() => setInitialChatUserId(null)}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="notifications" key="notifications-content">
                  <motion.div
                    key="notifications-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <NotificationsList 
                      user={effectiveUser} 
                      isAdmin={isAdminOrWorker}
                      onAction={(type, data) => {
                        if (type === 'new_message') {
                          if (data.senderId) {
                            setInitialChatUserId(data.senderId);
                          }
                          setActiveTab('chat');
                        } else if (type === 'new_order') {
                          setActiveTab(isAdminOrWorker ? 'admin' : 'my-orders');
                        }
                      }}
                    />
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="my-orders" key="orders-content">
                  <motion.div
                    key="orders-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <MasterDashboard user={effectiveUser} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="profile-settings" key="profile-settings-content">
                  <motion.div
                    key="profile-settings-div"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <ProfileSettings 
                      user={effectiveUser} 
                      userProfile={effectiveProfile} 
                      onLogout={() => {
                        auth.signOut();
                        handleWorkerLogin(false);
                        handleCustomerLogin(null);
                        setActiveTab(null);
                      }}
                    />
                  </motion.div>
                </TabsContent>

                {isAdminOrWorker && (
                  <TabsContent value="admin" key="admin-content">
                    <motion.div
                      key="admin-div"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <AdminDashboard 
                        user={effectiveUser} 
                        userProfile={effectiveProfile}
                      onAction={(type, data) => {
                        if (type === 'chat') {
                          if (data.senderId) {
                            setInitialChatUserId(data.senderId);
                          }
                          setActiveTab('chat');
                        }
                      }}
                    />
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
            </Tabs>
          )}
        </main>


        {/* Cart Sidebar */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white z-[101] shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">SAVAT</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cartItems.length} ta mahsulot</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full">
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-6">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 grayscale opacity-50">
                      <ShoppingCart className="w-20 h-20 text-gray-200" />
                      <p className="text-gray-500 font-bold">Savat hozircha bo'sh</p>
                      <Button onClick={() => setIsCartOpen(false)} variant="outline" className="rounded-xl">Xaridni davom ettirish</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-4 group">
                          <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                            <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="font-bold text-gray-900 truncate leading-tight">{item.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.category}</p>
                            <div className="flex items-center justify-between pt-1">
                              <p className="font-black text-blue-600">{(item.pricePerSqM * (item.quantity || 1)).toLocaleString()} so'm</p>
                              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                                <button 
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-blue-600 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-blue-600 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {cartItems.length > 0 && (
                  <div className="p-6 bg-gray-50 border-t space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Jami summa:</span>
                      <span className="text-2xl font-black text-gray-900 tracking-tighter">
                        {cartItems.reduce((acc, item) => acc + (item.pricePerSqM * (item.quantity || 1)), 0).toLocaleString()} <span className="text-sm font-bold text-gray-400">so'm</span>
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-8 text-lg font-black shadow-xl shadow-blue-200 gap-2 transition-all active:scale-95"
                      onClick={() => {
                        toast.info("Buyurtma berish uchun mahsulot o'lchamlarini kiriting");
                        setIsCartOpen(false);
                        setActiveTab('products');
                      }}
                    >
                      <Check className="w-5 h-5" />
                      BUYURTMA BERISH
                    </Button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white z-[101] shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b flex items-center justify-between bg-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-purple-600" />
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                      <ShoppingCart className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">SAVATINGIZ</h3>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cartItems.length} ta xarid</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsCartOpen(false)} 
                    className="rounded-2xl hover:bg-gray-100 w-12 h-12"
                  >
                    <X className="w-7 h-7 text-gray-400" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-8 py-6">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                      <div className="w-32 h-32 bg-gray-50 rounded-[2.5rem] flex items-center justify-center grayscale opacity-50">
                        <ShoppingCart className="w-16 h-16 text-gray-200" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-black text-gray-900 uppercase italic">Savat bo'sh</p>
                        <p className="text-gray-400 text-sm max-w-[200px] mx-auto">Katalogdan o'zingizga yoqqan mahsulotlarni tanlang.</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setIsCartOpen(false);
                          setActiveTab('catalog');
                        }} 
                        variant="outline" 
                        className="rounded-2xl px-8 h-12 font-bold border-2 border-blue-50 text-blue-600"
                      >
                        Xaridni boshlash
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-5 group">
                          <div className="w-24 h-24 bg-gray-50 rounded-3xl overflow-hidden shrink-0 border border-gray-100 shadow-sm relative">
                            <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-extrabold text-gray-900 text-lg leading-none truncate">{item.name}</h4>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">{item.category}</p>
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-xl font-black text-gray-900 tracking-tighter">
                                {(item.pricePerSqM * (item.quantity || 1)).toLocaleString()} <span className="text-[10px] font-bold text-gray-400">sum</span>
                              </p>
                              <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                <button 
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm hover:text-blue-600 transition-all active:scale-90"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-black min-w-[30px] text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm hover:text-blue-600 transition-all active:scale-90"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {cartItems.length > 0 && (
                  <div className="p-8 bg-white border-t space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest leading-none mb-1">Jami to'lov</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">
                          {cartItems.reduce((acc, item) => acc + (item.pricePerSqM * (item.quantity || 1)), 0).toLocaleString()} <span className="text-sm font-bold text-gray-400 uppercase">uzs</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full uppercase">Yetkazib berish bepul</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] py-8 text-xl font-black shadow-2xl shadow-blue-200 gap-3 transition-all active:scale-[0.98]"
                      onClick={() => {
                        toast.info("Buyurtma berish uchun mahsulot o'lchamlarini kiriting");
                        setIsCartOpen(false);
                        setActiveTab('catalog');
                      }}
                    >
                      BUYURTMA BERISH
                      <Send className="w-6 h-6" />
                    </Button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <footer className="mt-20 border-t border-gray-200 py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <h4 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Ijtimoiy tarmoqlarimiz</h4>
                <div className="flex gap-4">
                  {socialLinks.telegram && (
                    <a 
                      href={socialLinks.telegram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-blue-50 text-[#229ED9] rounded-2xl flex items-center justify-center hover:bg-[#229ED9] hover:text-white transition-all shadow-sm"
                    >
                      <Send className="w-6 h-6" />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a 
                      href={socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-pink-50 text-[#E4405F] rounded-2xl flex items-center justify-center hover:bg-[#E4405F] hover:text-white transition-all shadow-sm"
                    >
                      <Instagram className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} svark_uz. Barcha huquqlar himoyalangan.
              </p>
            </div>
          </div>
        </footer>

        {tryOnOpen && (
          <VirtualTryOn 
            initialProductImage={tryOnProductImage || undefined}
            onClose={() => {
              setTryOnOpen(false);
              setTryOnProductImage(null);
            }}
          />
        )}

        {/* AI Advisor Floating Button */}
        {activeTab !== 'svark-ai' && (
          <div className="fixed bottom-24 sm:bottom-8 right-6 z-40 flex flex-col items-end gap-3">
            <AnimatePresence>
              {isAIAdvisorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="bg-white rounded-3xl shadow-2xl p-6 border border-blue-50 w-72 mb-2 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm italic tracking-tight">AI MASLAHATCHI</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Onlayn yordam</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 font-medium leading-relaxed">
                    Sizga darvoza dizayni yoki narxlari bo'yicha yordam kerakmi? Men bilan bog'laning!
                  </p>
                  <Button 
                    onClick={() => {
                      setActiveTab('svark-ai');
                      setIsAIAdvisorOpen(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 font-bold text-xs gap-2 shadow-xl shadow-blue-100 group-hover:scale-[1.02] transition-transform"
                  >
                    Maslahat olish (Get Advice)
                    <Send className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setIsAIAdvisorOpen(!isAIAdvisorOpen)}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 transition-all hover:scale-110 active:scale-95 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles className={`w-8 h-8 transition-transform duration-500 ${isAIAdvisorOpen ? 'rotate-180 scale-110' : ''}`} />
              {unreadCount > 0 && !isAIAdvisorOpen && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                  !
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

