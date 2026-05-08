import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogIn, LogOut, User, Shield, HardHat, Users, Phone, Chrome } from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '../lib/LanguageContext';

interface NavbarProps {
  user: any;
  userProfile: any;
  unreadCount?: number;
  onWorkerLogin: (isWorker: boolean) => void;
  onCustomerLogin: (data: any) => void;
  isWorkerSession: boolean;
  isCustomerSession: boolean;
  theme?: string;
  setTheme?: (theme: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  userProfile, 
  unreadCount = 0,
  onWorkerLogin, 
  onCustomerLogin, 
  isWorkerSession, 
  isCustomerSession,
  theme,
  setTheme
}) => {
  const { t, setLanguage, language } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerPass, setWorkerPass] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpenLogin = () => setLoginOpen(true);
    window.addEventListener('open-login-modal', handleOpenLogin);
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLogin);
    };
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      const role = userDoc.exists() ? userDoc.data()?.role : (result.user.email === 'kidsafeuzb@gmail.com' ? 'admin' : 'customer');

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          displayName: result.user.displayName,
          firstName: result.user.displayName?.split(' ')[0] || '',
          lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          email: result.user.email,
          role: role,
          profileComplete: false,
          createdAt: serverTimestamp()
        });
      }

      if (role === 'admin' || role === 'master') {
        onWorkerLogin(true);
      } else {
        onCustomerLogin({
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          role: role
        });
      }

      setLoginOpen(false);
      toast.success("Xush kelibsiz!");
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error("Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginMethod === 'phone' ? customerPhone : customerEmail;
    if (!identifier || !customerName) {
      toast.error(language === 'uz' ? "Ism va aloqa ma'lumotini kiriting" : "Введите имя и контактную информацию");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Create a unique ID based on phone or email
      const userUid = loginMethod === 'phone' 
        ? `phone_${identifier.replace(/\D/g, '')}` 
        : `email_${identifier.replace(/[@.]/g, '_')}`;
        
      const userRef = doc(db, 'users', userUid);
      const userDoc = await getDoc(userRef);

      let userData;
      if (userDoc.exists()) {
        userData = userDoc.data();
        // Update name if changed
        if (userData.displayName !== customerName) {
          await setDoc(userRef, { ...userData, displayName: customerName }, { merge: true });
          userData.displayName = customerName;
        }
      } else {
        userData = {
          uid: userUid,
          displayName: customerName,
          phone: loginMethod === 'phone' ? identifier : null,
          email: loginMethod === 'email' ? identifier : null,
          role: 'customer',
          profileComplete: false,
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, userData);
      }

      onCustomerLogin(userData);
      setLoginOpen(false);
      toast.success(language === 'uz' ? "Xush kelibsiz!" : "Добро пожаловать!");
      
      // Save for persistence in window if needed by App.tsx
      localStorage.setItem('customer_session', JSON.stringify(userData));
    } catch (err: any) {
      console.error(err);
      setError(language === 'uz' ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName || !workerPass) return;

    setLoading(true);
    setError('');
    // Updated verification with master name and password
    if (workerName === 'Umid' && workerPass === '201030') {
      onWorkerLogin(true);
      setLoginOpen(false);
      toast.success(t('welcome'));
    } else {
      setError(language === 'uz' ? "Parol noto'g'ri" : "Неверный пароль");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    signOut(auth);
    onWorkerLogin(false);
    onCustomerLogin(null);
  };

  const isLoggedIn = user || isWorkerSession || isCustomerSession;
  const logoUrl = "https://i.ibb.co/kg3vHQyN/photo-2026-05-03-13-33-41.jpg";

  return (
    <nav className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-gold/10'} backdrop-blur-xl border-b shadow-sm transition-colors`}>
      <div id="recaptcha-container"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="relative">
              <div className="absolute inset-0 bg-gold blur-xl opacity-10 group-hover:opacity-30 transition-opacity" />
              <img 
                src={logoUrl} 
                alt="svark_uz logo" 
                className="w-16 h-16 object-cover relative z-10 rounded-[1.2rem] border-2 border-gold/20 shadow-md transform group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className={`text-2xl font-black tracking-[0.2em] uppercase italic ${theme === 'dark' ? 'text-white' : 'text-gold'}`}>svark_uz</span>
              <span className={`text-[10px] font-black tracking-[0.4em] uppercase -mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gold/60'}`}>Premium Quality</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className={`text-sm font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {isWorkerSession ? (language === 'uz' ? 'Umidjon Usta' : 'Мастер Умиджон') : (userProfile?.displayName || userProfile?.firstName || user?.displayName || (language === 'uz' ? 'Mijoz' : 'Клиент'))}
                  </span>
                  <span className="text-[10px] text-gold font-black uppercase tracking-widest flex items-center gap-1 bg-gold/5 px-3 py-1 rounded-full mt-1 border border-gold/20 shadow-inner">
                    {isWorkerSession || userProfile?.role === 'admin' || user?.email === 'kidsafeuzb@gmail.com' ? (
                      <>
                        <Shield className="w-3 h-3 text-gold" /> 
                        {language === 'uz' ? 'Admin' : 'Админ'}
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-gold" /> 
                        {language === 'uz' ? 'Mijoz' : 'Клиент'}
                      </>
                    )}
                  </span>
                </div>
                {/* ... existing profile avatar code ... */}
                <div className="relative group/avatar">
                  <div className={`w-14 h-14 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gold/5 border-gold/10'} shadow-sm overflow-hidden flex items-center justify-center group-hover/avatar:border-gold/30 transition-all hover:shadow-lg`}>
                    {userProfile?.photoURL || user?.photoURL ? (
                      <img src={userProfile?.photoURL || user?.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-7 h-7 text-gold/40" />
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl text-gray-400 hover:text-gold hover:bg-gold/5 transition-all">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                <DialogTrigger 
                  render={
                    <Button className="bg-gold hover:bg-gold-light text-white px-8 py-7 gap-3 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-gold/20 transition-all hover:scale-105 active:scale-95">
                      <LogIn className="w-5 h-5" />
                      {t('login')}
                    </Button>
                  } 
                />
                <DialogContent className={`sm:max-w-[440px] rounded-[3rem] p-0 overflow-hidden border ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gold/20'} shadow-[0_0_50px_rgba(184,134,11,0.15)]`}>
                  <div className="bg-gold p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <DialogHeader className="relative z-10">
                      <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter text-white">
                        {t('login')}
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-white/80 font-black uppercase tracking-widest text-[10px] mt-4 relative z-10">
                      {t('welcome_back')}
                    </p>
                  </div>

                  <div className="p-10">
                    <Tabs defaultValue="client" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-gray-50 p-1 mb-8 shadow-inner border border-gold/5">
                        <TabsTrigger value="client" className="rounded-xl font-black uppercase italic tracking-widest text-[10px] py-3 data-[state=active]:bg-gold data-[state=active]:text-white shadow-sm transition-all">
                          <User className="w-3 h-3 mr-2" />
                          Mijoz
                        </TabsTrigger>
                        <TabsTrigger value="usta" className="rounded-xl font-black uppercase italic tracking-widest text-[10px] py-3 data-[state=active]:bg-black data-[state=active]:text-white shadow-sm transition-all">
                          <HardHat className="w-3 h-3 mr-2" />
                          Usta
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="client" className="space-y-6">
                        <div className="space-y-6">
                          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gold/5 mb-6">
                            <button 
                              onClick={() => setLoginMethod('phone')}
                              className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${loginMethod === 'phone' ? 'bg-white text-gold shadow-sm' : 'text-gray-400 font-bold'}`}
                            >
                              Telefon orqali
                            </button>
                            <button 
                              onClick={() => setLoginMethod('email')}
                              className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${loginMethod === 'email' ? 'bg-white text-gold shadow-sm' : 'text-gray-400 font-bold'}`}
                            >
                              Email orqali
                            </button>
                          </div>

                          <form onSubmit={handleSimpleLogin} className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-gold ml-1">Ismingiz</Label>
                              <Input 
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Ismingizni kiriting"
                                className="h-14 rounded-xl bg-gray-50 border-none shadow-inner px-4 font-bold"
                              />
                            </div>
                            
                            {loginMethod === 'phone' ? (
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gold ml-1">Telefon raqam</Label>
                                <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/40" />
                                  <Input 
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="90 123 45 67"
                                    className="pl-12 h-14 rounded-xl bg-gray-50 border-none shadow-inner font-bold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gold ml-1">Gmail Account</Label>
                                <div className="relative">
                                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/40" />
                                  <Input 
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="example@gmail.com"
                                    className="pl-12 h-14 rounded-xl bg-gray-50 border-none shadow-inner font-bold"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

                            <Button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-gold hover:bg-gold-light text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gold/20 mt-4"
                            >
                              {loading ? '...' : (language === 'uz' ? 'Kirish' : 'Войти')}
                            </Button>
                          </form>
                          
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Yoki Google orqali</p>
                            <Button 
                              onClick={handleGoogleLogin} 
                              variant="outline" 
                              className="w-full h-14 rounded-xl border-gray-100 mt-4 gap-3 font-bold"
                            >
                              <Chrome className="w-5 h-5 text-red-500" />
                              Google bilan kirish
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="usta" className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gold/10 space-y-3">
                          <div className="flex items-center gap-3 text-gold">
                            <Shield className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Usta xizmati haqida</span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic">
                            "Bu bo'lim faqat usta va adminlar uchun mo'ljallangan. Usta tizim orqali buyurtmalar, mijozlar va mahsulotlarni boshqarish imkoniyatiga ega bo'ladi."
                          </p>
                        </div>
                        <form onSubmit={handleWorkerLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gold">Usta ismi</Label>
                            <Input 
                              type="text" 
                              value={workerName}
                              onChange={(e) => setWorkerName(e.target.value)}
                              placeholder="Usta ismini kiriting"
                              className="h-14 rounded-xl border-gray-100 focus:ring-gold focus:border-gold px-4 bg-gray-50 font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gold">{t('password')}</Label>
                            <Input 
                              type="password" 
                              value={workerPass}
                              onChange={(e) => setWorkerPass(e.target.value)}
                              placeholder="••••••••"
                              className="h-14 rounded-xl border-gray-100 focus:ring-gold focus:border-gold px-4 bg-gray-50 font-medium"
                            />
                          </div>
                          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}
                          <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-black hover:bg-gray-900 text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                          >
                            {loading ? '...' : t('login')}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
