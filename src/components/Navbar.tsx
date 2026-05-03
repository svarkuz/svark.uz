import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  useEffect(() => {
    const handleOpenLogin = () => setLoginOpen(true);
    window.addEventListener('open-login-modal', handleOpenLogin);
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLogin);
    };
  }, []);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone) return;
    
    setLoading(true);
    setError('');
    setupRecaptcha();
    
    const appVerifier = (window as any).recaptchaVerifier;
    try {
      const formattedPhone = customerPhone.startsWith('+') ? customerPhone : `+${customerPhone}`;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setVerificationId(confirmationResult);
      setShowOtp(true);
      toast.success(language === 'uz' ? "SMS kod yuborildi!" : "SMS код отправлен!");
    } catch (err: any) {
      console.error(err);
      setError(language === 'uz' ? "Raqam noto'g'ri yoki xatolik yuz berdi" : "Неверный номер или произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || !verificationId) return;

    setLoading(true);
    setError('');
    try {
      const result = await verificationId.confirm(smsCode);
      const user = result.user;
      
      const userData = {
        uid: user.uid,
        displayName: customerName || 'Mijoz',
        phone: user.phoneNumber,
        role: 'customer',
        profileComplete: true,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      onCustomerLogin(userData);
      setLoginOpen(false);
      toast.success(t('welcome'));
    } catch (err: any) {
      setError(language === 'uz' ? "Kod noto'g'ri" : "Неверный код");
    } finally {
      setLoading(false);
    }
  };

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

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName || !workerPass) return;

    setLoading(true);
    setError('');
    // Updated verification with master name and password
    if (workerName === 'Umid' && workerPass === '201030SamatovUmid') {
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
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-2xl" />
                    <h2 className="text-4xl font-black italic tracking-tighter mb-2 relative z-10 uppercase">{t('welcome')}</h2>
                    <p className="text-white/80 text-xs relative z-10 font-bold uppercase tracking-widest">{t('premium_services')}</p>
                  </div>
                  <div className={`p-8 ${theme === 'dark' ? 'bg-gray-950' : 'bg-white'}`}>
                    <Tabs defaultValue="customer" className="w-full">
                      <TabsList className={`grid w-full grid-cols-2 mb-8 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gold/10'} p-1.5 rounded-[1.5rem] border`}>
                        <TabsTrigger value="customer" className="rounded-xl py-3 flex gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-gray-400">
                          <Users className="w-4 h-4" /> {t('customer')}
                        </TabsTrigger>
                        <TabsTrigger value="worker" className="rounded-xl py-3 flex gap-2 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-gray-400">
                          <HardHat className="w-4 h-4" /> {t('worker')}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="customer" className="space-y-6">
                        {!showOtp ? (
                          <form onSubmit={handlePhoneLogin} className="space-y-6">
                            <div className="space-y-3">
                              <Label htmlFor="customerName" className="text-[10px] font-black text-gold uppercase tracking-[0.2em] ml-1">{t('enter_name')}</Label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/30" />
                                <Input 
                                  id="customerName" 
                                  value={customerName} 
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder={t('enter_name')}
                                  className={`pl-12 h-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-none focus-visible:ring-2 focus-visible:ring-gold/30 placeholder:text-gray-400 transition-all shadow-inner`}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="customerPhone" className="text-[10px] font-black text-gold uppercase tracking-[0.2em] ml-1">{t('enter_phone')}</Label>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/30" />
                                <Input 
                                  id="customerPhone" 
                                  value={customerPhone} 
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="+998 -- --- -- --"
                                  className={`pl-12 h-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-none focus-visible:ring-2 focus-visible:ring-gold/30 placeholder:text-gray-400 transition-all shadow-inner`}
                                  required
                                />
                              </div>
                            </div>
                            {error && <p className="text-xs text-red-500 text-center font-black uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}
                            <Button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-gold hover:bg-gold-light text-white h-18 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-gold/20 transition-all active:scale-[0.98]"
                            >
                              {loading ? (language === 'uz' ? 'YUBORILMOQDA...' : 'ОТПРАВКА...') : (language === 'uz' ? 'KODNI OLISH' : 'ПОЛУЧИТЬ КОД')}
                            </Button>
                          </form>
                        ) : (
                          <form onSubmit={verifyOtp} className="space-y-6">
                            <div className="space-y-3">
                              <Label htmlFor="smsCode" className="text-[10px] font-black text-gold uppercase tracking-[0.2em] ml-1">{language === 'uz' ? 'SMS Kod' : 'SMS Код'}</Label>
                              <Input 
                                id="smsCode" 
                                value={smsCode} 
                                onChange={(e) => setSmsCode(e.target.value)}
                                placeholder="------"
                                className={`h-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-none text-center text-2xl font-black tracking-[0.5em] focus-visible:ring-2 focus-visible:ring-gold/30 shadow-inner`}
                                required
                              />
                            </div>
                            {error && <p className="text-xs text-red-500 text-center font-black uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}
                            <Button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-gold hover:bg-gold-light text-white h-18 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-gold/20 transition-all active:scale-[0.98]"
                            >
                              {loading ? (language === 'uz' ? 'TASDIQLANMOQDA...' : 'ПОДТВЕРЖДЕНИЕ...') : (language === 'uz' ? 'TASDIQLASH' : 'ПОДТВЕРДИТЬ')}
                            </Button>
                            <Button variant="link" onClick={() => setShowOtp(false)} className="w-full text-gold font-black uppercase text-[10px] tracking-widest">
                              {language === 'uz' ? 'Raqamni o\'zgartirish' : 'Изменить номер'}
                            </Button>
                          </form>
                        )}
                        
                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center">
                            <span className={`w-full border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gold/10'}`} />
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]">
                            <span className={`${theme === 'dark' ? 'bg-gray-950' : 'bg-white'} px-4 text-gold/40`}>{t('or_premium')}</span>
                          </div>
                        </div>

                        <Button 
                          variant="outline"
                          onClick={(e) => { e.preventDefault(); handleGoogleLogin(); }} 
                          disabled={loading}
                          className={`w-full h-18 rounded-3xl border-2 ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-900 text-white' : 'border-gold/10 bg-transparent text-gray-900 hover:bg-gold/5'} flex items-center justify-center gap-4 font-black uppercase tracking-widest transition-all`}
                        >
                          <Chrome className="w-6 h-6 text-gold" />
                          {t('google_login')}
                        </Button>
                      </TabsContent>
  
                      <TabsContent value="worker" className="space-y-6">
                        <form onSubmit={handleWorkerLogin} className="space-y-6">
                          <div className="space-y-3">
                            <Label htmlFor="workerName" className="text-[10px] font-black text-gold uppercase tracking-[0.2em] ml-1">{language === 'uz' ? 'Ism' : 'Имя'}</Label>
                            <Input 
                              id="workerName" 
                              value={workerName} 
                              onChange={(e) => setWorkerName(e.target.value)}
                              placeholder={language === 'uz' ? 'USTA ISMI' : 'ИМЯ МАСТЕРА'}
                              className={`h-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-none focus-visible:ring-2 focus-visible:ring-gold/30 transition-all shadow-inner`}
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="workerPass" className="text-[10px] font-black text-gold uppercase tracking-[0.2em] ml-1">{t('secret_pass')}</Label>
                            <Input 
                              id="workerPass" 
                              type="password"
                              value={workerPass} 
                              onChange={(e) => setWorkerPass(e.target.value)}
                              placeholder="••••••••"
                              className={`h-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-none focus-visible:ring-2 focus-visible:ring-gold/30 transition-all shadow-inner`}
                            />
                          </div>
                          {error && <p className="text-xs text-red-500 text-center font-black uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}
                          <Button type="submit" className="w-full bg-gold text-white hover:bg-gold-light h-18 rounded-3xl font-black text-xl uppercase tracking-widest transition-all active:scale-[0.98]">
                            {t('master_login')}
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
