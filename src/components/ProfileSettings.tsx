import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Camera, Save, LogOut, CheckCircle2, UserCircle, Trash2, Pencil, ChevronRight, Package, Smile, Settings, Globe, Info, Mail, Instagram, Send, Star, RefreshCw, Ruler, ArrowLeft, Briefcase, Shield, Phone, Layers, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileSettingsProps {
  user: any;
  userProfile: any;
  onLogout?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps & { 
  theme?: string; 
  setTheme?: (t: string) => void; 
  fontSize?: string; 
  setFontSize?: (s: string) => void; 
}> = ({ user, userProfile, onLogout, theme, setTheme, fontSize, setFontSize }) => {
  const [view, setView] = useState<'main' | 'editing' | 'orders' | 'reviews' | 'settings' | 'language' | 'about' | 'contact'>('main');
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [workplace, setWorkplace] = useState(userProfile?.workplace || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [submitting, setSubmitting] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
      setPhone(userProfile.phone || userProfile.phone || '');
      setWorkplace(userProfile.workplace || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile, view]);

  // Fetch orders
  useEffect(() => {
    if (view === 'orders' && user?.uid) {
      setLoadingOrders(true);
      const { collection, query, where, orderBy, onSnapshot } = require('firebase/firestore');
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap: any) => {
        setOrders(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        setLoadingOrders(false);
      }, (err: any) => {
        console.error(err);
        setLoadingOrders(false);
      });
      return () => unsub();
    }
  }, [view, user?.uid]);

  // Fetch reviews
  useEffect(() => {
    if (view === 'reviews' && user?.uid) {
      setLoadingReviews(true);
      const { collection, query, where, onSnapshot } = require('firebase/firestore');
      const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
      const unsub = onSnapshot(q, (snap: any) => {
        setReviews(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        setLoadingReviews(false);
      }, (err: any) => {
        console.error(err);
        setLoadingReviews(false);
      });
      return () => unsub();
    }
  }, [view, user?.uid]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.uid) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Rasm juda katta. Iltimos 5MB dan kichik rasm tanlang.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const img = new Image();
        img.src = result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedResult = canvas.toDataURL('image/jpeg', 0.7);
          setPhotoURL(compressedResult);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Foydalanuvchi identifikatori topilmadi");
      return;
    }
    
    setSubmitting(true);
    try {
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
        profileComplete: true
      };

      if (userProfile?.role === 'master' || userProfile?.role === 'admin') {
        updateData.workplace = workplace.trim();
        updateData.bio = bio.trim();
      }

      if (photoURL !== userProfile?.photoURL) {
        updateData.photoURL = photoURL;
      }

      await setDoc(doc(db, 'users', user.uid), {
        ...updateData,
        uid: user.uid,
        role: userProfile?.role || 'customer'
      }, { merge: true });
      toast.success("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
      setView('main');
    } catch (error: any) {
      console.error("Firestore update error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderViewContent = () => {
    switch (view) {
      case 'editing':
        return (
          <div className="space-y-6">
            <div className="bg-gold p-8 rounded-[2.5rem] text-white shadow-xl shadow-gold/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[1.5rem] bg-white/20 backdrop-blur-md border-2 border-white overflow-hidden shadow-xl relative">
                    {photoURL ? (
                      <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-gold rounded-lg shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">PROFILNI TAHRIRLASH</h2>
                  <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-1">Ma'lumotlaringizni yangilang</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gold/5 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Ism</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20 font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Familiya</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20 font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20 font-medium shadow-inner" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Ko'rinadigan ism</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Masalan: Hasan" className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20 font-medium" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={submitting} className="flex-1 bg-gold hover:bg-gold-light text-white h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all">
                  {submitting ? "Saqlanmoqda..." : "SAQLASH"}
                </Button>
                <Button variant="outline" onClick={() => setView('main')} className="px-8 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-gray-400">
                  BEKOR QILISH
                </Button>
              </div>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">BUYURTMALARIM</h2>
            </div>
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-gold w-10 h-10" /></div>
              ) : orders.length === 0 ? (
                <div className="py-24 text-center bg-gray-50 rounded-[3rem] border border-gold/10 shadow-inner">
                  <Package className="w-16 h-16 mx-auto text-gold/20 mb-6" />
                  <p className="font-black text-gray-400 uppercase text-[10px] tracking-[0.3em] italic">Buyurtmalar hali mavjud emas</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border border-gold/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gold/20 group-hover:bg-gold transition-colors" />
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-black text-xl text-gray-900 italic uppercase tracking-tighter group-hover:text-gold transition-colors">{order.productName || 'Maxsus buyurtma'}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {order.createdAt?.toDate?.()?.toLocaleDateString() || 'Yaqinda'}
                        </p>
                      </div>
                      <Badge className={`${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gold/10 text-gold'
                      } border-none rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest italic`}>
                        {order.status === 'completed' ? 'Bajarildi' : order.status === 'pending' ? 'Kutilmoqda' : 'Jarayonda'}
                      </Badge>
                    </div>
                    {(order.width || order.height) && (
                      <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 bg-gray-50 w-fit px-4 py-2 rounded-full border border-gold/5">
                        <div className="flex items-center gap-2 font-bold"><Ruler className="w-3.5 h-3.5 text-gold/40" /> {order.width}x{order.height}m</div>
                        <div className="flex items-center gap-2 text-gold">{(order.width * order.height).toFixed(2)} m²</div>
                      </div>
                    )}
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">ORDER ID: {order.id}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">SHARHLARIM</h2>
            </div>
            <div className="space-y-4">
              {loadingReviews ? (
                <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-gold w-10 h-10" /></div>
              ) : reviews.length === 0 ? (
                <div className="py-24 text-center bg-gray-50 rounded-[3rem] border border-gold/10 shadow-inner">
                  <Smile className="w-16 h-16 mx-auto text-gold/20 mb-6" />
                  <p className="font-black text-gray-400 uppercase text-[10px] tracking-[0.3em] italic">Sharhlar hali mavjud emas</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-gold/5 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gold/20 group-hover:bg-gold transition-colors" />
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">{review.createdAt?.toDate?.()?.toLocaleDateString() || 'Yaqinda'}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-700 italic leading-relaxed group-hover:text-gray-900 transition-colors">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">SOZLAMALAR</h2>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gold/5 shadow-sm space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="space-y-6">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Mavzu (Theme)</Label>
                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => setTheme?.('light')}
                    className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 relative group/theme ${theme === 'light' ? 'border-gold bg-gold/5 shadow-xl shadow-gold/10' : 'border-gray-50 bg-gray-50/50'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${theme === 'light' ? 'bg-white text-gold shadow-md' : 'bg-white/50 text-gray-400'}`}>
                      <Smile className="w-8 h-8" />
                    </div>
                    <span className={`font-black text-[10px] uppercase tracking-widest italic tracking-tight ${theme === 'light' ? 'text-gold' : 'text-gray-400'}`}>YORIQLIK</span>
                  </button>
                  <button 
                    onClick={() => setTheme?.('dark')}
                    className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 relative group/theme ${theme === 'dark' ? 'border-gold bg-gold/10 shadow-xl shadow-gold/20' : 'border-gray-50 bg-gray-50/50'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-gray-900 text-gold shadow-md' : 'bg-white/50 text-gray-400'}`}>
                      <Smile className="w-8 h-8" />
                    </div>
                    <span className={`font-black text-[10px] uppercase tracking-widest italic tracking-tight ${theme === 'dark' ? 'text-gold' : 'text-gray-400'}`}>QORONG'U</span>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Yozuv o'lchami</Label>
                <div className="flex bg-gray-50 p-2 rounded-[1.5rem] gap-2 border border-gold/5 scroll-inner shadow-inner h-16">
                  {['small', 'medium', 'large'].map((s) => (
                    <button 
                      key={s}
                      onClick={() => setFontSize?.(s)}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase italic transition-all duration-300 ${fontSize === s ? 'bg-white shadow-xl text-gold border border-gold/10' : 'text-gray-400'}`}
                    >
                      {s === 'small' ? 'Kichik' : s === 'medium' ? 'O\'rta' : 'Katta'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">TIL (LANGUAGE)</h2>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-gold/5 shadow-sm space-y-6">
              <button 
                className="w-full p-8 rounded-[2.5rem] border-2 border-gold bg-gold/5 flex items-center justify-between shadow-xl shadow-gold/10 group active:scale-98 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-gold font-black italic transform group-hover:rotate-12 transition-transform">UZ</div>
                  <span className="font-black italic text-xl text-gray-900 uppercase tracking-tighter">O'zbekcha</span>
                </div>
                <div className="bg-gold text-white p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </button>
              <button 
                onClick={() => toast.info("Rus tili tez orada qo'shiladi")}
                className="w-full p-8 rounded-[2.5rem] border-2 border-gray-50 bg-gray-50/50 flex items-center justify-between opacity-50 grayscale hover:grayscale-0 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 font-bold">RU</div>
                  <span className="font-black italic text-xl text-gray-400 uppercase tracking-tighter">Русский</span>
                </div>
                <div className="p-2">
                   <ChevronRight className="w-6 h-6 text-gray-300" />
                </div>
              </button>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">BIZ HAQIMIZDA</h2>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gold/5 shadow-sm space-y-10 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full blur-3xl -mr-24 -mt-24" />
              <div className="flex flex-col items-center space-y-6 relative z-10">
                <div className="w-24 h-24 bg-gold rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-gold/30 transform hover:scale-110 transition-transform duration-500">
                  <Layers className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-4xl font-black italic tracking-tighter text-gray-900">SVARK.AI</h3>
                  <p className="text-[10px] font-black text-gold uppercase tracking-[0.4em] mt-2">Dizayn va Texnologiya</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 italic leading-relaxed px-4">
                Svark.ai - bu O'zbekistondagi eng zamonaviy metall buyumlari va darvozalar ishlab chiqarish platformasi. Biz sun'iy intellekt yordamida mijozlarimizga o'z uylari uchun eng mukammal dizaynni tanlashda yordam beramiz.
              </p>
              <div className="pt-6 space-y-6">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] italic">IJTIMOIY TARMOQLAR</p>
                <div className="flex justify-center gap-6">
                  <a href="https://instagram.com/svark_uz" target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shadow-xl shadow-pink-200/50 transform hover:-translate-y-2 transition-all active:scale-90">
                    <Instagram className="w-8 h-8" />
                  </a>
                  <a href="https://t.me/svark_uz" target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-[#0088cc] flex items-center justify-center text-white shadow-xl shadow-[#0088cc]/30 transform hover:-translate-y-2 transition-all active:scale-90">
                    <Send className="w-8 h-8" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gold/5">
              <Button variant="ghost" size="icon" onClick={() => setView('main')} className="rounded-2xl h-12 w-12 hover:bg-gold/10 text-gold transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">BOG'LANISH</h2>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-gold/5 shadow-sm space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-amber-50/30 border border-amber-100 flex items-center justify-between group hover:bg-amber-50 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">MARKAZIY ADMIN</p>
                    <p className="text-2xl font-black italic text-gray-900 tracking-tighter">95 217 81 42</p>
                  </div>
                </div>
                <a href="tel:+998952178142" className="w-14 h-14 rounded-full bg-gold text-white flex items-center justify-center shadow-xl shadow-gold/20 hover:scale-110 active:scale-95 transition-all">
                  <Phone className="w-6 h-6" />
                </a>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-gold/5 border border-gold/10 flex items-center justify-between group hover:bg-gold hover:text-white hover:shadow-xl hover:shadow-gold/20 transition-all duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-gold group-hover:rotate-12 transition-all">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1 group-hover:text-white/70 transition-colors">YETAKCHI USTA</p>
                    <p className="text-2xl font-black italic text-gray-900 group-hover:text-white tracking-tighter transition-colors">90 932 39 92</p>
                  </div>
                </div>
                <a href="tel:+998909323992" className="w-14 h-14 rounded-full bg-gold border-2 border-white/20 text-white flex items-center justify-center shadow-xl shadow-gold/10 hover:scale-110 active:scale-95 transition-all">
                  <Phone className="w-6 h-6" />
                </a>
              </div>
              <div className="pt-6">
                <p className="text-[10px] font-black text-gray-300 italic text-center px-10 leading-relaxed uppercase tracking-widest">
                  MUTAXASSISLARIMIZ HAFTANING ISTALGAN KUNIDA SOAT 09:00 DAN 20:00 GACHA XIZMATINGIZDA.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white rounded-[3rem] p-6 flex items-center justify-between border border-gold/10 shadow-xl shadow-gold/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-24 h-24 rounded-[2rem] bg-gray-50 overflow-hidden border-4 border-white shadow-2xl transform transition-transform group-hover:rotate-2">
                    {userProfile?.photoURL || user?.photoURL ? (
                      <img src={userProfile?.photoURL || user?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gold/5">
                        <UserCircle className="w-12 h-12 text-gold/30" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-gray-900 italic uppercase tracking-tighter">
                      {(userProfile?.displayName || userProfile?.firstName || user?.displayName || "Mehmon")}
                    </h3>
                    <p className="text-gold font-black text-[10px] mt-1 tracking-[0.2em] uppercase italic flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {userProfile?.phone || user?.phoneNumber || "Tizimda"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setView('editing')}
                  className="w-14 h-14 rounded-2xl bg-gold/5 text-gold flex items-center justify-center hover:bg-gold hover:text-white transition-all duration-300 shadow-sm active:scale-90"
                >
                  <Pencil className="w-6 h-6" />
                </button>
              </div>
            </motion.div>

            {/* Main Menu Items */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-white rounded-[3rem] border border-gold/5 shadow-lg overflow-hidden p-3 space-y-1">
                <button onClick={() => setView('orders')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Package className="w-7 h-7 text-gray-400 group-hover:text-gold" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Buyurtmalarim</span>
                  </div>
                  <div className="bg-gray-50 h-10 w-10 rounded-xl flex items-center justify-center group-hover:bg-gold/10 transition-all">
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gold" />
                  </div>
                </button>
                <div className="mx-8 border-b border-gray-50/50" />
                <button onClick={() => setView('reviews')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Smile className="w-7 h-7 text-gray-400 group-hover:text-amber-500" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Sharhlarim</span>
                  </div>
                  <div className="bg-gray-50 h-10 w-10 rounded-xl flex items-center justify-center group-hover:bg-amber-50 transition-all">
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-amber-500" />
                  </div>
                </button>
              </div>
            </motion.div>

            {/* Settings section */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-white rounded-[3rem] border border-gold/5 shadow-lg overflow-hidden p-3 space-y-1">
                <button onClick={() => setView('settings')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Settings className="w-7 h-7 text-gray-400 group-hover:text-indigo-500" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Sozlamalar</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-indigo-500" />
                </button>
                <div className="mx-8 border-b border-gray-50/50" />
                <button onClick={() => setView('language')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Globe className="w-7 h-7 text-gray-400 group-hover:text-emerald-500" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Til</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-emerald-600 italic uppercase bg-emerald-50 px-3 py-1.5 rounded-full">UZB</span>
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-emerald-500" />
                  </div>
                </button>
                <div className="mx-8 border-b border-gray-50/50" />
                <button onClick={() => setView('about')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Info className="w-7 h-7 text-gray-400 group-hover:text-gold" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Biz haqimizda</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gold" />
                </button>
                <div className="mx-8 border-b border-gray-50/50" />
                <button onClick={() => setView('contact')} className="w-full px-6 py-6 flex items-center justify-between hover:bg-gold/5 transition-all rounded-[2rem] group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg flex items-center justify-center transition-all duration-300">
                      <Mail className="w-7 h-7 text-gray-400 group-hover:text-rose-500" />
                    </div>
                    <span className="font-black italic text-lg text-gray-800 uppercase tracking-tighter group-hover:text-gray-900">Bog'lanish</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-rose-500" />
                </button>
              </div>
            </motion.div>

            {/* Logout button */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <button 
                onClick={onLogout}
                className="w-full py-6 text-gray-400 font-black italic tracking-widest uppercase bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 duration-300 shadow-red-100/5"
              >
                Tizimdan chiqish
              </button>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 px-4 py-4 min-h-[70vh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderViewContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);
