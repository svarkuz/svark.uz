import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogIn, LogOut, User, Shield, HardHat, Users, Phone, Chrome } from 'lucide-react';
import { toast } from 'sonner';

interface NavbarProps {
  user: any;
  userProfile: any;
  unreadCount?: number;
  onWorkerLogin: (isWorker: boolean) => void;
  onCustomerLogin: (data: any) => void;
  isWorkerSession: boolean;
  isCustomerSession: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  userProfile, 
  unreadCount = 0,
  onWorkerLogin, 
  onCustomerLogin, 
  isWorkerSession, 
  isCustomerSession 
}) => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerPass, setWorkerPass] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const handleOpenLogin = () => setLoginOpen(true);
    window.addEventListener('open-login-modal', handleOpenLogin);
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLogin);
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          role: result.user.email === 'kidsafeuzb@gmail.com' ? 'admin' : 'master',
          profileComplete: true,
          createdAt: serverTimestamp()
        });
      }

      // Handle session based on role
      const role = userDoc.exists() ? userDoc.data()?.role : (result.user.email === 'kidsafeuzb@gmail.com' ? 'admin' : 'master');
      
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

  const handleWorkerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (workerName === 'Umid' && workerPass === '201030') {
      onWorkerLogin(true);
      setLoginOpen(false);
      setError('');
    } else {
      setError('Ism yoki parol noto\'g\'ri');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    onWorkerLogin(false);
    onCustomerLogin(null);
  };

  const setupRecaptcha = () => {
    try {
      // 1. Cleanup existing instances to avoid "already rendered" errors
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch (e) {
          console.warn("Recaptcha clear error:", e);
        }
        verifierRef.current = null;
      }
      
      // 2. Ensure container exists
      const containerId = 'recaptcha-container';
      const container = document.getElementById(containerId);
      
      if (!container) {
        console.error("Recaptcha container not found in DOM");
        return null;
      }

      // 3. Initialize new verifier
      verifierRef.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha resolved');
        },
        'expired-callback': () => {
          toast.error("reCAPTCHA vaqti tugadi, iltimos qaytadan urinib ko'ring.");
        }
      });
      
      return verifierRef.current;
    } catch (err: any) {
      console.error("Recaptcha init error:", err);
      // If it says "already rendered", try to use the one stored in verifierRef or window
      if (err.message?.includes('already rendered')) {
         return verifierRef.current;
      }
      return null;
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone) {
      setError('Iltimos, telefon raqamingizni kiriting');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const verifier = setupRecaptcha();
      if (!verifier) {
        throw new Error("reCAPTCHA-ni ishga tushirib bo'lmadi. Sahifani yangilab ko'ring.");
      }

      // Format phone number to E.164 if not already (e.g. +998...)
      let formattedPhone = customerPhone.trim();
      if (!formattedPhone.startsWith('+')) {
        // Clean non-digits for formatting
        const digits = formattedPhone.replace(/\D/g, '');
        if (digits.length === 9) {
          formattedPhone = '+998' + digits;
        } else if (digits.length > 9) {
          formattedPhone = '+' + digits;
        } else {
          throw new Error("Telefon raqami noto'g'ri shaklda");
        }
      } else {
        // Ensure + remains but and clean everything else (like spaces)
        const prefix = formattedPhone.slice(0, 1);
        const rest = formattedPhone.slice(1).replace(/\D/g, '');
        formattedPhone = prefix + rest;
      }
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      toast.success("Tasdiqlash kodi telefoningizga yuborildi!");
    } catch (err: any) {
      console.error('Phone login error:', err);
      let UzbekError = "Kod yuborishda xatolik yuz berdi";
      
      if (err.code === 'auth/unauthorized-domain') {
        UzbekError = "Ushbu domen Firebase-da ruxsat etilganlar ro'yxatiga qo'shilmagan. Iltimos, Firebase konsolida domenni ruxsat etilganlar ro'yxatiga qo'shing.";
      } else if (err.code === 'auth/too-many-requests') {
        UzbekError = "Juda ko'p urinishlar bo'ldi. Birozdan so'ng qaytadan urinib ko'ring.";
      } else if (err.code === 'auth/operation-not-allowed') {
        UzbekError = "Telefon orqali kirish hali faollashtirilmagan. Firebase konsolida (Authentication > Sign-in method) 'Phone' provayderini yoqib qo'ying va 'Enable' tugmasini bosganingizdan keyin pastdagi 'Save' tugmasini bosishni unutmang.";
      } else if (err.code === 'auth/captcha-check-failed') {
        UzbekError = "reCAPTCHA tekshiruvi muvaffaqiyatsiz tugadi. Sahifani yangilab qaytadan urinib ko'ring.";
      } else if (err.code === 'auth/invalid-phone-number') {
        UzbekError = "Telefon raqami noto'g'ri kiritilgan.";
      }
      
      setError(UzbekError);
      toast.error(UzbekError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !confirmationResult) return;

    setLoading(true);
    setError('');
    try {
      const result = await confirmationResult.confirm(otpCode);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: customerName || 'Usta',
          phone: user.phoneNumber,
          role: 'master', // Default to master/worker as requested
          profileComplete: true,
          createdAt: serverTimestamp()
        });
      }

      const role = userDoc.exists() ? userDoc.data()?.role : 'master';
      
      if (role === 'admin' || role === 'master') {
        onWorkerLogin(true);
      } else {
        onCustomerLogin({
          uid: user.uid,
          displayName: user.displayName || customerName || 'Mijoz',
          phone: user.phoneNumber,
          role: role
        });
      }
      
      setLoginOpen(false);
      setConfirmationResult(null);
      setOtpCode('');
      toast.success("Muvaffaqiyatli kirdingiz!");
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError('Tasdiqlash kodi noto\'g\'ri');
      toast.error("Tasdiqlash kodi xato");
    } finally {
      setLoading(false);
    }
  };

  const isLoggedIn = user || isWorkerSession || isCustomerSession;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <img 
                src="https://i.ibb.co/rGStjV9t/photo-2026-04-19-13-06-56.jpg" 
                alt="svark_uz logo" 
                className="w-12 h-12 object-cover rounded-2xl relative z-10 border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900">svark_uz</span>
          </div>

          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900 leading-tight">
                    {isWorkerSession ? 'Umidjon Usta' : (userProfile?.displayName || userProfile?.firstName || user?.displayName || 'Mijoz')}
                  </span>
                  <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full mt-0.5">
                    {isWorkerSession || userProfile?.role === 'admin' || user?.email === 'kidsafeuzb@gmail.com' ? (
                      <><Shield className="w-3 h-3" /> Admin</>
                    ) : (
                      <><User className="w-3 h-3" /> Mijoz</>
                    )}
                  </span>
                </div>
                <div className="relative group/avatar">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center group-hover/avatar:border-blue-200 transition-colors">
                    {userProfile?.photoURL || user?.photoURL ? (
                      <img src={userProfile?.photoURL || user?.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 gap-2 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95" />}>
                  <LogIn className="w-4 h-4" />
                  Kirish
                </DialogTrigger>
                <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-blue-600 p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />
                    <h2 className="text-3xl font-black mb-2 relative z-10">Xush kelibsiz!</h2>
                    <p className="text-blue-100 text-sm relative z-10 opacity-80 font-medium">Tizimga kirish uchun quyidagilardan birini tanlang</p>
                  </div>
                  <div className="p-8 bg-white">
                    <Tabs defaultValue="customer" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        <TabsTrigger value="customer" className="rounded-xl py-3 flex gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Users className="w-4 h-4" /> Mijoz
                        </TabsTrigger>
                        <TabsTrigger value="worker" className="rounded-xl py-3 flex gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <HardHat className="w-4 h-4" /> Ishchi
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="customer" className="space-y-6">
                        {!confirmationResult ? (
                          <form onSubmit={handleSendOTP} className="space-y-5">
                            <div className="space-y-2">
                              <Label htmlFor="customerName" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Ismingiz</Label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                <Input 
                                  id="customerName" 
                                  value={customerName} 
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder="Ismingizni kiriting"
                                  className="pl-12 h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="customerPhone" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Telefon raqamingiz</Label>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                <Input 
                                  id="customerPhone" 
                                  value={customerPhone} 
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="+998 90 123 45 67"
                                  className="pl-12 h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                                  required
                                />
                              </div>
                            </div>
                            {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 py-2 rounded-xl">{error}</p>}
                            <Button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                            >
                              {loading ? 'Yuborilmoqda...' : 'Kod olish'}
                            </Button>
                            
                            <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100" />
                              </div>
                              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                                <span className="bg-white px-4 text-gray-400">Yoki</span>
                              </div>
                            </div>

                            <Button 
                              variant="outline"
                              onClick={(e) => { e.preventDefault(); handleGoogleLogin(); }} 
                              disabled={loading}
                              className="w-full h-16 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 flex items-center justify-center gap-3 font-bold transition-all"
                            >
                              <Chrome className="w-5 h-5 text-blue-600" />
                              Google orqali kirish
                            </Button>
                          </form>
                        ) : (
                          <form onSubmit={handleVerifyOTP} className="space-y-5">
                            <div className="space-y-2">
                              <Label htmlFor="otpCode" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tasdiqlash kodi</Label>
                              <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                <Input 
                                  id="otpCode" 
                                  value={otpCode} 
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  placeholder="------"
                                  className="pl-12 h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all text-center text-2xl tracking-[10px] font-bold"
                                  maxLength={6}
                                  required
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase text-center mt-2 tracking-widest">
                                {customerPhone} raqamiga yuborilgan kodni kiriting
                              </p>
                            </div>
                            {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 py-2 rounded-xl">{error}</p>}
                            <div className="flex gap-3">
                              <Button 
                                type="button"
                                variant="outline"
                                onClick={() => setConfirmationResult(null)}
                                className="flex-1 h-16 rounded-2xl font-bold"
                              >
                                Orqaga
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={loading}
                                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                              >
                                {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                              </Button>
                            </div>
                          </form>
                        )}
                      </TabsContent>
  
                      <TabsContent value="worker" className="space-y-6">
                        <form onSubmit={handleWorkerLogin} className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="workerName" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Ism</Label>
                            <Input 
                              id="workerName" 
                              value={workerName} 
                              onChange={(e) => setWorkerName(e.target.value)}
                              placeholder="Ismingizni kiriting"
                              className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="workerPass" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Parol</Label>
                            <Input 
                              id="workerPass" 
                              type="password"
                              value={workerPass} 
                              onChange={(e) => setWorkerPass(e.target.value)}
                              placeholder="Parolni kiriting"
                              className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                            />
                          </div>
                          {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 py-2 rounded-xl">{error}</p>}
                          <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-gray-100 transition-all active:scale-[0.98]">
                            Ishchi sifatida kirish
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                    <div id="recaptcha-container"></div>
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
