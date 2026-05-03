import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, CheckCircle2, XCircle, Package, Phone, User, MapPin, ImageIcon, FileText, History, Star, Sparkles, HardHat } from 'lucide-react';
import { toast } from 'sonner';

import { WorkflowManager } from './WorkflowManager';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const MasterDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [craftsmanId, setCraftsmanId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid && userRole === 'master') {
      const q = query(collection(db, 'craftsmen'), where('name', '==', 'Umidjon Usta'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setBio(docData.bio || '');
          setCraftsmanId(snapshot.docs[0].id);
        }
      });
      return () => unsub();
    }
  }, [user?.uid, userRole]);

  const handleUpdateBio = async () => {
    try {
      await setDoc(doc(db, 'settings', 'about'), { bio }, { merge: true });
      toast.success("Biz haqimizda ma'lumotlari saqlandi!");
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    const unsubSocial = onSnapshot(doc(db, 'settings', 'social'), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });
    return () => unsubSocial();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Get user role first
    onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const role = docSnap.data().role;
        setUserRole(role);
      }
    });

    if (userRole) {
      const q = userRole === 'master' 
        ? query(collection(db, 'orders'), where('masterId', '==', user.uid), orderBy('createdAt', 'desc'))
        : query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ords);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      return () => unsubscribe();
    }
  }, [user?.uid, userRole]);

  const handleReview = async (orderId: string, masterId: string) => {
    if (!rating[orderId]) {
      toast.error("Iltimos, baholang");
      return;
    }
    try {
      await addDoc(collection(db, 'reviews'), {
        orderId,
        masterId,
        userId: user.uid,
        rating: rating[orderId],
        comment: reviewText[orderId] || '',
        userName: user.displayName || 'Mijoz',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'orders', orderId), { reviewed: true });
      toast.success("Sharhingiz uchun rahmat!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled'
      });
      toast.success("Buyurtma bekor qilindi");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black uppercase text-[10px] tracking-widest px-3 py-1">Kutilmoqda</Badge>;
      case 'processing': return <Badge className="bg-gold/10 text-gold hover:bg-gold/10 border border-gold/20 font-black uppercase text-[10px] tracking-widest px-3 py-1">Jarayonda</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-black uppercase text-[10px] tracking-widest px-3 py-1">Tayyor</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none font-black uppercase text-[10px] tracking-widest px-3 py-1">Bekor qilindi</Badge>;
      default: return <Badge className="font-black uppercase text-[10px] tracking-widest px-3 py-1">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-24 bg-gray-50 rounded-[3rem] border border-gold/10 shadow-inner">
        <Package className="w-16 h-16 text-gold/20 mx-auto mb-6" />
        <p className="text-gray-400 font-black uppercase text-xs tracking-[0.2em]">Buyurtmalaringizni ko'rish uchun tizimga kiring.</p>
      </div>
    );
  }

  if (loading) return <div className="h-64 bg-gray-50 animate-pulse rounded-[3rem] border border-gold/10 shadow-inner" />;

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const historyOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const OrderCard = ({ order }: { order: any }) => (
    <Card key={order.id} className="border border-gold/5 shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white group">
      <CardContent className="p-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-2xl text-gray-900 italic uppercase tracking-tighter group-hover:text-gold transition-colors">{order.productName}</h3>
                {getStatusBadge(order.status)}
              </div>
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-6">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gold/40" />
                    {order.createdAt?.toDate()?.toLocaleDateString() || '...'}
                  </span>
                {order.width && order.height && (
                  <span className="bg-gray-50 px-3 py-1 rounded-full border border-gold/5 text-gray-500">
                    {order.width}m x {order.height}m ({order.totalArea?.toFixed(2)} m²)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
              <div className="flex gap-2">
                {userRole === 'master' && order.userPhone && (
                  <a href={`tel:${order.userPhone}`}>
                    <Button 
                      variant="outline" 
                      className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Qo'ng'iroq
                    </Button>
                  </a>
                )}
                {order.status === 'pending' && userRole !== 'master' && (
                  <Button 
                    variant="ghost" 
                    onClick={() => handleCancel(order.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest"
                  >
                    Bekor qilish
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-gold/5">
            {order.designImageUrl && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-gold/40" /> Tanlangan dizayn
                </span>
                <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-gray-50 border border-gold/5 group-hover:shadow-lg transition-all">
                  <img src={order.designImageUrl} alt="Design" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </div>
            )}
            {order.siteImageUrl && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gold/40" /> O'rnatish joyi
                </span>
                <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-gray-50 border border-gold/5 group-hover:shadow-lg transition-all">
                  <img src={order.siteImageUrl} alt="Site" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </div>
            )}
            {order.completionImageUrl && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tayyor ish rasmi
                </span>
                <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-gray-50 border-2 border-green-100 shadow-xl group-hover:shadow-green-100 transition-all">
                  <img src={order.completionImageUrl} alt="Completed" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </div>
            )}
          </div>

          {order.status === 'completed' && !order.reviewed && userRole !== 'master' && (
            <div className="mt-4 p-8 bg-gold/5 rounded-[2.5rem] space-y-6 border border-gold/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <h4 className="font-black text-gold uppercase italic tracking-tighter text-xl flex items-center gap-3">
                <Star className="w-6 h-6 fill-gold" />
                Xizmatni baholang
              </h4>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(prev => ({ ...prev, [order.id]: star }))}
                    className="transition-all transform active:scale-75 hover:scale-110"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        star <= (rating[order.id] || 0) 
                          ? 'text-gold fill-gold drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' 
                          : 'text-gray-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input 
                  placeholder="Fikringizni yozing..." 
                  value={reviewText[order.id] || ''} 
                  onChange={(e) => setReviewText(prev => ({ ...prev, [order.id]: e.target.value }))}
                  className="h-14 rounded-2xl flex-1 bg-white border-gold/10 focus-visible:ring-gold/20 px-6 font-medium"
                />
                <Button onClick={() => handleReview(order.id, order.masterId)} className="bg-gold hover:bg-gold-light text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-gold/20">
                  Yuborish
                </Button>
              </div>
            </div>
          )}

          {(order.locationType || order.description) && (
            <div className="p-6 bg-gray-50/80 rounded-3xl space-y-4 border border-gold/5">
              {order.locationType && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gold/5">
                    <MapPin className="w-4 h-4 text-gold" />
                  </div>
                  <span className="font-black uppercase text-[10px] tracking-widest text-gray-400">Joylashuv:</span>
                  <span className="font-black text-gray-900 uppercase italic tracking-tighter text-sm">
                    {order.locationType === 'home' ? 'Uy' : order.locationType === 'work' ? 'Ish joyi' : 'Boshqa'}
                  </span>
                </div>
              )}
              {order.description && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gold/5 shrink-0">
                    <FileText className="w-4 h-4 text-gold" />
                  </div>
                  <span className="font-black uppercase text-[10px] tracking-widest text-gray-400 pt-1">Tavsif:</span>
                  <span className="text-gray-600 font-medium leading-relaxed">{order.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-12">
      {/* Contact Worker Section */}
      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-gold text-white relative group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <CardContent className="p-10 flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Ishchi bilan bog'lanish</h3>
              <p className="text-white/70 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Savollaringiz bo'lsa bizga bog'laning</p>
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end gap-6">
            <div className="text-center lg:text-right">
              <span className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 justify-center lg:justify-end">
                <Sparkles className="w-5 h-5" />
                UMID USTA
              </span>
              <div className="flex items-center gap-3 mt-3 justify-center lg:justify-end">
                {socialLinks?.telegram && (
                  <a href={socialLinks.telegram} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white hover:text-gold transition-all shadow-md">
                    <History className="w-5 h-5" />
                  </a>
                )}
                {socialLinks?.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white hover:text-gold transition-all shadow-md">
                    <Star className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            <a 
              href="tel:+998909323992" 
              className="flex items-center gap-4 bg-white text-gold px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.22em] text-sm hover:translate-y-[-4px] transition-all shadow-2xl shadow-gold/40 active:translate-y-0"
            >
              <Phone className="w-6 h-6" />
              +998 90 932 39 92
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <Tabs defaultValue="active" className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
            <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter border-l-4 border-gold pl-6">Mening buyurtmalarim</h2>
            <TabsList className="bg-gray-100 p-1.5 rounded-[1.5rem] border border-gold/5 shadow-inner h-14">
              <TabsTrigger value="active" className="rounded-[1rem] px-8 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-lg transition-all">
                Buyurtmalar
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-[1rem] px-8 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-lg transition-all">
                Tarix
              </TabsTrigger>
              {userRole === 'master' && (
                <TabsTrigger value="settings" className="rounded-[1rem] px-8 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
                  Tahrirlash
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-8 mt-0 outline-none">
            {activeOrders.length === 0 ? (
              <div className="text-center py-32 bg-gray-50 rounded-[4rem] border border-gold/10 shadow-inner">
                <Package className="w-20 h-20 text-gold/10 mx-auto mb-8" />
                <p className="text-gray-400 font-black uppercase text-xs tracking-[0.3em]">Sizda faol buyurtmalar yo'q.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-8 mt-0 outline-none">
            {historyOrders.length === 0 ? (
              <div className="text-center py-32 bg-gray-50 rounded-[4rem] border border-gold/10 shadow-inner">
                <History className="w-20 h-20 text-gold/10 mx-auto mb-8" />
                <p className="text-gray-400 font-black uppercase text-xs tracking-[0.3em]">Buyurtmalar tarixi bo'sh.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {historyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          {userRole === 'master' && (
            <TabsContent value="settings" className="space-y-12 mt-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
                  <div className="bg-gold p-8 text-white">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Biz haqimizda</h3>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Mijozlar ko'radigan ma'lumotni tahrirlash</p>
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio / Ma'lumot</Label>
                      <Textarea 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="O'zingiz haqingizda ma'lumot yozing..."
                        className="min-h-[200px] rounded-3xl border-gray-100 focus:ring-gold bg-gray-50 p-6 text-gray-700 leading-relaxed"
                      />
                    </div>
                    <Button 
                      onClick={handleUpdateBio}
                      className="w-full bg-gold hover:bg-gold-light text-white h-16 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-gold/20"
                    >
                      O'zgarishlarni saqlash
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
                  <div className="bg-black p-8 text-white">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Ishchi qo'shish</h3>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Yangi mutaxassislarni tizimga qo'shing</p>
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <p className="text-gray-500 text-sm italic">Bu bo'lim administratorlar uchun yangi ishchi profillarini yaratish imkonini beradi.</p>
                    <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                      <HardHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-xs text-gray-400 font-bold uppercase">Tez kunda: Ishchilarni boshqarish tizimi</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};
