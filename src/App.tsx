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
import { OrderDialog } from '@/src/components/OrderDialog';
import { VirtualTryOn } from '@/src/components/VirtualTryOn';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, ClipboardList, Settings, Camera, Sparkles, MessageSquare, Bell, Send, Instagram, Briefcase, Shield, User, Layers, Users, ShoppingCart, Trash2, Plus, Minus, Check, Menu, X, History, Star, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { LanguageProvider, useLanguage } from './lib/LanguageContext';

function AppContent() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [initialChatUserId, setInitialChatUserId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Rest of the hooks...

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    const sizeMap: any = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
  }, [fontSize]);

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
  const [aboutUs, setAboutUs] = useState<string>('');

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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

  const isAdminOrWorker = isWorkerSession || 
    userProfile?.role === 'admin' || 
    (user?.email === 'kidsafeuzb@gmail.com' && user?.emailVerified);
  
  const effectiveUser = user || 
    (isWorkerSession ? { uid: 'worker_session', displayName: 'Umid (Ishchi)', role: 'master' } : 
    (isCustomerSession ? { uid: localCustomerData?.uid, displayName: localCustomerData?.displayName, isLocal: true, role: 'customer' } : null));

  const effectiveProfile = userProfile || 
    (isWorkerSession ? { role: 'master', displayName: 'Umid (Ishchi)' } : 
    (isCustomerSession ? localCustomerData : null));

  useEffect(() => {
    const activeUid = effectiveUser?.uid;
    if (activeUid) {
      const updateHeartbeat = async () => {
        if (!activeUid) return;
        try {
          await setDoc(doc(db, 'users', activeUid), {
            uid: activeUid,
            role: effectiveUser?.role || 'customer',
            lastActive: serverTimestamp(),
            isOnline: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e: any) {
          if (e.code === 'permission-denied') {
            console.warn("Heartbeat permission denied for UID:", activeUid);
          } else {
            console.error("Heartbeat error:", e);
          }
        }
      };

      updateHeartbeat();
      const interval = setInterval(updateHeartbeat, 60000); // Every minute
      
      const handleTabClose = () => {
        if (!activeUid) return;
        setDoc(doc(db, 'users', activeUid), {
          uid: activeUid,
          isOnline: false,
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      };
      
      window.addEventListener('beforeunload', handleTabClose);
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleTabClose);
      };
    }
  }, [effectiveUser?.uid, effectiveUser?.role]);

  useEffect(() => {
    const unsubSocial = onSnapshot(doc(db, 'settings', 'social'), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });

    const unsubAbout = onSnapshot(doc(db, 'settings', 'about'), (docSnap) => {
      if (docSnap.exists()) {
        setAboutUs(docSnap.data().bio || '');
      }
    });

    return () => {
      unsubSocial();
      unsubAbout();
    };
  }, []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnProductImage, setTryOnProductImage] = useState<string | null>(null);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [aiSubView, setAiSubView] = useState<'chat' | 'test' | null>(null);

  useEffect(() => {
    // Seed sample craftsmen and products if empty
    const seedInitialData = async () => {
      const { getDocs, collection, addDoc, updateDoc, doc, serverTimestamp, query, where } = await import('firebase/firestore');
      
      // Patch: Fix existing Naves products with wrong image
      const existingNavesQ = query(collection(db, 'products'), where('category', '==', 'naves'));
      const existingNavesSnap = await getDocs(existingNavesQ);
      for (const d of existingNavesSnap.docs) {
        const data = d.data();
        if (data.imageUrl === "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg" || data.imageUrl === "https://i.ibb.co/hRdR75PG/photo-2026-04-10-19-55-26.jpg" || data.imageUrl === "https://i.ibb.co/4Rtcmz73/photo-2026-04-10-19-59-34.jpg") {
          await updateDoc(doc(db, 'products', d.id), {
            imageUrl: "https://i.ibb.co/xKDDStgk/photo-2026-04-01-18-18-43.jpg",
            images: []
          });
        }
      }

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
            imageUrl: "https://i.ibb.co/xKDDStgk/photo-2026-04-01-18-18-43.jpg"
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
      
      const userData: any = {
        uid: data.uid,
        role: 'customer',
        profileComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (data.displayName) userData.displayName = data.displayName;
      if (data.phone) userData.phone = data.phone;
      
      try {
        await setDoc(doc(db, 'users', data.uid), userData, { merge: true });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin shadow-xl shadow-gold/20" />
          <div className="flex flex-col items-center">
            <p className="text-gray-900 font-black italic uppercase tracking-widest animate-pulse">Yuklanmoqda...</p>
            <p className="text-[10px] text-gold font-black uppercase tracking-[0.3em] mt-1">svark_uz premium</p>
          </div>
        </div>
      </div>
    );
  }

  const needsProfileSetup = user && userProfile && userProfile.profileComplete === false && !isWorkerSession && !isCustomerSession;

  const logoUrl = "https://i.ibb.co/kg3vHQyN/photo-2026-05-03-13-33-41.jpg";

  return (
    <ErrorBoundary>
      <>
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
        className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 w-16 h-16 bg-gold dark:bg-black text-white dark:text-gold rounded-full shadow-[0_10px_30px_rgba(184,134,11,0.3)] flex items-center justify-center z-50 cursor-pointer group overflow-hidden border-2 border-white dark:border-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-gold-light to-gold dark:from-gray-900 dark:to-black opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles className="w-8 h-8 relative z-10" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl uppercase tracking-widest">
          {t('ai_advisor')}
        </div>
      </motion.button>

      <Toaster position="top-center" richColors />
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'} font-sans selection:bg-gold/10 selection:text-gold pb-20`}>
        <Navbar 
          user={effectiveUser} 
          userProfile={effectiveProfile} 
          unreadCount={unreadCount}
          onWorkerLogin={handleWorkerLogin}
          onCustomerLogin={handleCustomerLogin}
          isWorkerSession={isWorkerSession}
          isCustomerSession={isCustomerSession}
          theme={theme}
          setTheme={setTheme}
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
                  <div className="absolute inset-0 bg-gold blur-2xl opacity-20 animate-pulse" />
                  <img 
                    src={logoUrl} 
                    alt="svark_uz logo" 
                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl relative z-10 border-4 border-white dark:border-gray-800"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-5xl sm:text-7xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 leading-[1.1]`}
                >
                  {language === 'uz' ? (
                    <>Sizning uyingiz uchun <br /> <span className="text-gold">mukammal</span> temir ishlar</>
                  ) : (
                    <>Идеальные <span className="text-gold">железные</span> работы <br /> для вашего дома</>
                  )}
                </motion.h1>
                
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto">
                      {aboutUs || (language === 'uz' ? "Bizning jamoamiz yuqori sifatli temir mahsulotlari ishlab chiqarish va o'rnatish bilan shug'ullanadi. Har bir buyurtmaga professional yondashamiz." : "Наша команда занимается производством и установкой высококачественных металлических изделий. Мы подходим к каждому заказу профессионально.")}
                    </p>
                
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
                    className="bg-gold hover:bg-gold-light text-white px-10 py-8 rounded-2xl font-black text-xl shadow-[0_10px_40px_rgba(184,134,11,0.2)] w-full group transition-all uppercase italic tracking-tighter"
                  >
                    {t('login')}
                    <User className="w-6 h-6 ml-2 group-hover:scale-110 transition-transform" />
                  </Button>
                </motion.div>
              </div>

              {/* Rest of the landing page... */}
            </motion.div>
          ) : (
            <Tabs 
              value={activeTab || (isAdminOrWorker ? "admin" : "catalog")} 
              onValueChange={setActiveTab}
              className="space-y-6 sm:space-y-8"
            >
              <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                  <TabsList className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} p-1.5 rounded-[2.5rem] border w-max min-w-full shadow-inner`}>
                  {!isAdminOrWorker && (
                    <TabsTrigger value="catalog" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        {t('catalog')}
                      </div>
                    </TabsTrigger>
                  )}
                  {!isAdminOrWorker && (
                    <TabsTrigger value="workflows" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        {t('add_process')}
                      </div>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="gallery" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      {t('gallery')}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="svark-ai" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      SVARK AI
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} relative`}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {t('chat')}
                    </div>
                  </TabsTrigger>
                  {effectiveUser && (
                    <TabsTrigger value="notifications" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} relative`}>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        {t('messages')}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                          {unreadCount}
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                  {effectiveUser && !isAdminOrWorker && (
                    <TabsTrigger value="my-reviews" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        {t('my_reviews')}
                      </div>
                    </TabsTrigger>
                  )}
                  {effectiveUser && (
                    <TabsTrigger value="profile-settings" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t('profile')}
                      </div>
                    </TabsTrigger>
                  )}
                  {isAdminOrWorker && (
                    <TabsTrigger value="admin" className={`rounded-[2rem] px-8 py-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=dark]:data-[state=active]:bg-white data-[state=dark]:data-[state=active]:text-black data-[state=active]:shadow-lg font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {t('panel')}
                      </div>
                    </TabsTrigger>
                  )}
                  </TabsList>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCartOpen(true)}
                  className="relative rounded-[1.5rem] bg-gold/5 hover:bg-gold/10 h-16 w-16 border border-gold/10 shadow-sm ml-2 text-gold transition-all active:scale-95"
                >
                  <ShoppingCart className="w-8 h-8" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
                      {cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0)}
                    </span>
                  )}
                </Button>
              </div>

              {/* Mobile Bottom Navigation - Scrollable for many items */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gold/10 px-4 py-3 z-50 flex items-center shadow-2xl overflow-x-auto scrollbar-hide gap-6">
                {!isAdminOrWorker && (
                  <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'catalog' ? 'text-gold' : 'text-gold/30'}`}
                  >
                    <LayoutGrid className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Katalog</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('svark-ai')}
                  className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'svark-ai' ? 'text-gold' : 'text-gold/30'}`}
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">AI</span>
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'chat' ? 'text-gold' : 'text-gold/30'}`}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Chat</span>
                </button>
                {effectiveUser && (
                  <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative ${activeTab === 'notifications' ? 'text-gold' : 'text-gold/30'}`}
                  >
                    <Bell className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Xabarlar</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-2 bg-gold text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
                {isAdminOrWorker ? (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'admin' ? 'text-gold' : 'text-gold/30'}`}
                  >
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Panel</span>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setActiveTab('my-orders')}
                      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'my-orders' ? 'text-gold' : 'text-gold/30'}`}
                    >
                      <ClipboardList className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Buyurtma</span>
                    </button>
                    {effectiveUser && (
                      <button 
                        onClick={() => setActiveTab('profile-settings')}
                        className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${activeTab === 'profile-settings' ? 'text-gold' : 'text-gold/30'}`}
                      >
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Profil</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setIsCartOpen(true)}
                      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative ${isCartOpen ? 'text-gold' : 'text-gold/30'}`}
                    >
                      <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        {cartItems.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-gold text-white text-[8px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center border border-white px-0.5">
                            {cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tighter">Savat</span>
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
                      userProfile={effectiveProfile}
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
                    <Gallery user={effectiveUser} addToCart={addToCart} />
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 sm:p-8"
                  >
                    {!aiSubView ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto py-12">
                        <motion.div 
                          whileHover={{ y: -10 }}
                          onClick={() => setAiSubView('chat')}
                          className="bg-gray-50 rounded-[4rem] p-12 border border-gold/10 shadow-xl hover:shadow-gold/20 cursor-pointer group transition-all"
                        >
                          <div className="w-24 h-24 bg-gold rounded-[2rem] flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-12 h-12" />
                          </div>
                          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-4">Svark AI</h3>
                          <p className="text-gray-500 text-lg leading-relaxed font-medium">Intellektual yordamchi bilan suhbatlashing va savollaringizga javob oling.</p>
                        </motion.div>

                        <motion.div 
                          whileHover={{ y: -10 }}
                          onClick={() => setAiSubView('test')}
                          className="bg-gray-50 rounded-[4rem] p-12 border border-gold/10 shadow-xl hover:shadow-gold/20 cursor-pointer group transition-all"
                        >
                          <div className="w-24 h-24 bg-black rounded-[2rem] flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                            <Camera className="w-12 h-12" />
                          </div>
                          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-4">{t('virtual_test')}</h3>
                          <p className="text-gray-500 text-lg leading-relaxed font-medium">Darvozangizni hovlingizga moslab ko'ring (Tez kunda).</p>
                        </motion.div>
                      </div>
                    ) : aiSubView === 'chat' ? (
                      <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gold text-white">
                          <h3 className="font-black uppercase italic tracking-widest text-xl">Svark AI Chat</h3>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setAiSubView(null)}
                            className="text-white hover:bg-white/20"
                          >
                            <XCircle className="w-8 h-8" />
                          </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <SvarkAI user={effectiveUser} />
                        </div>
                      </div>
                    ) : (
                      <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-8">
                         <div className="absolute top-8 right-8">
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setAiSubView(null)}
                              className="text-gray-500 hover:bg-gray-100"
                            >
                              <XCircle className="w-10 h-10" />
                            </Button>
                         </div>
                         <div className="text-center space-y-6">
                           <div className="w-32 h-32 bg-gold/10 rounded-[3rem] flex items-center justify-center text-gold mx-auto animate-bounce">
                             <Camera className="w-16 h-16" />
                           </div>
                           <h2 className="text-5xl font-black italic uppercase tracking-tighter">{t('virtual_test')}</h2>
                           <p className="text-gray-500 text-xl font-medium max-w-md mx-auto">Tez kunda! Bu bo'lim orqali siz o'z uyingiz rasmini yuklab, bizning darvozalarimizni unga o'rnatib ko'rishingiz mumkin bo'ladi.</p>
                         </div>
                      </div>
                    )}
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

                <TabsContent value="workflows" key="workflows-content">
                  <motion.div
                    key="workflows-div"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-8"
                  >
                    <div className="max-w-4xl mx-auto space-y-8">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 border-l-8 border-gold pl-8">Bizning ish jarayonimiz</h2>
                       <WorkflowManager user={null} />
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="my-reviews" key="reviews-content">
                  <motion.div
                    key="reviews-div"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-8"
                  >
                    <div className="max-w-4xl mx-auto">
                       <div className="bg-gray-50 rounded-[4rem] p-12 sm:p-24 border border-gold/10 text-center space-y-8">
                         <div className="w-32 h-32 bg-gold/10 rounded-[3rem] flex items-center justify-center text-gold mx-auto">
                           <Star className="w-16 h-16" />
                         </div>
                         <h2 className="text-4xl font-black italic uppercase tracking-tighter">{t('my_reviews')}</h2>
                         <p className="text-gray-400 font-black uppercase text-xs tracking-[0.3em]">{t('no_reviews')}</p>
                         <Button 
                           onClick={() => setActiveTab('catalog')}
                           className="bg-gold text-white px-8 h-16 rounded-[2rem] font-black uppercase tracking-widest"
                         >
                           Xarid qilish
                         </Button>
                       </div>
                    </div>
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
                      theme={theme}
                      setTheme={setTheme}
                      fontSize={fontSize}
                      setFontSize={setFontSize}
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
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gold to-gold-light" />
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-gold/20">
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
                        className="rounded-2xl px-8 h-12 font-bold border-2 border-gold/10 text-gold"
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
                            <p className="text-[10px] text-gold font-black uppercase tracking-[0.2em]">{item.category}</p>
                            <div className="flex items-center justify-between pt-2">
                              <div></div>
                              <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                <button 
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm hover:text-gold transition-all active:scale-90"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-black min-w-[30px] text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm hover:text-gold transition-all active:scale-90"
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
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full uppercase">Yetkazib berish bepul</span>
                    </div>
                    <Button 
                      className="w-full bg-gold hover:bg-gold-light text-white rounded-[2rem] py-8 text-xl font-black shadow-2xl shadow-gold/20 gap-3 transition-all active:scale-[0.98]"
                      onClick={() => {
                        if (cartItems.length > 0) {
                          setSelectedOrderProduct(cartItems[0]);
                          setOrderDialogOpen(true);
                          setIsCartOpen(false);
                        }
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
                      className="w-12 h-12 bg-gold/5 text-gold rounded-2xl flex items-center justify-center hover:bg-gold hover:text-white transition-all shadow-sm"
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

      </div>

      <AnimatePresence>
        {orderDialogOpen && (
          <OrderDialog 
            product={selectedOrderProduct}
            user={effectiveUser}
            onClose={() => {
              setOrderDialogOpen(false);
              setSelectedOrderProduct(null);
            }}
          />
        )}
      </AnimatePresence>
      </>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

