import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, CheckCircle2, XCircle, Package, Phone, User, MapPin, ImageIcon, FileText, History, Star } from 'lucide-react';
import { toast } from 'sonner';

export const MasterDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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
        setUserRole(docSnap.data().role);
      }
    });

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
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Kutilmoqda</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Jarayonda</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Tayyor</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Bekor qilindi</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Buyurtmalaringizni ko'rish uchun tizimga kiring.</p>
      </div>
    );
  }

  if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-2xl" />;

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const historyOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const OrderCard = ({ order }: { order: any }) => (
    <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900">{order.productName}</h3>
                {getStatusBadge(order.status)}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {order.createdAt?.toDate()?.toLocaleDateString() || '...'}
                  </span>
                {order.width && order.height && (
                  <span>{order.width}m x {order.height}m ({order.totalArea?.toFixed(2)} m²)</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
              <div className="flex gap-2">
                {userRole === 'master' && order.userPhone && (
                  <a href={`tel:${order.userPhone}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 rounded-xl"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Mijozga qo'ng'iroq
                    </Button>
                  </a>
                )}
                {order.status === 'pending' && userRole !== 'master' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCancel(order.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Bekor qilish
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
            {order.designImageUrl && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Tanlangan dizayn
                </span>
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-50">
                  <img src={order.designImageUrl} alt="Design" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            {order.siteImageUrl && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> O'rnatish joyi
                </span>
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-50">
                  <img src={order.siteImageUrl} alt="Site" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            {order.completionImageUrl && (
              <div className="space-y-2 col-span-full">
                <span className="text-xs font-bold text-green-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tayyor ish rasmi
                </span>
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-50 border-2 border-green-100 shadow-lg">
                  <img src={order.completionImageUrl} alt="Completed" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          {order.status === 'completed' && !order.reviewed && userRole !== 'master' && (
            <div className="mt-4 p-6 bg-blue-50 rounded-3xl space-y-4">
              <h4 className="font-bold text-blue-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Xizmatni baholang
              </h4>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(prev => ({ ...prev, [order.id]: star }))}
                    className="transition-transform active:scale-95"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= (rating[order.id] || 0) 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Fikringizni yozing..." 
                  value={reviewText[order.id] || ''} 
                  onChange={(e) => setReviewText(prev => ({ ...prev, [order.id]: e.target.value }))}
                  className="rounded-xl flex-1 bg-white border-blue-100"
                />
                <Button onClick={() => handleReview(order.id, order.masterId)} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                  Yuborish
                </Button>
              </div>
            </div>
          )}

          {(order.locationType || order.description) && (
            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
              {order.locationType && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Joylashuv:</span>
                  <span className="text-gray-600">
                    {order.locationType === 'home' ? 'Uy' : order.locationType === 'work' ? 'Ish joyi' : 'Boshqa'}
                  </span>
                </div>
              )}
              {order.description && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="font-medium">Tavsif:</span>
                  <span className="text-gray-600">{order.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Contact Worker Section */}
      <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-blue-600 text-white">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ishchi bilan bog'lanish</h3>
              <p className="text-blue-100 opacity-80">Savollaringiz bo'lsa bizga bog'laning</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-3">
            <div className="text-right">
              <span className="text-lg font-bold block">UMID USTA</span>
              <div className="flex items-center gap-3 mt-1">
                {socialLinks?.telegram && (
                  <a href={socialLinks.telegram} target="_blank" rel="noreferrer" className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                    <History className="w-4 h-4" /> {/* Use a placeholder icon for telegram if none available */}
                  </a>
                )}
                {socialLinks?.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Star className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            <a 
              href="tel:+998909323992" 
              className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-xl shadow-blue-900/20"
            >
              <Phone className="w-5 h-5" />
              +998 90 932 39 92
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Tabs defaultValue="active" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Mening buyurtmalarim</h2>
            <TabsList className="bg-gray-100/50 p-1 rounded-2xl">
              <TabsTrigger value="active" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Faol
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Tarix
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-6 mt-0">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Sizda faol buyurtmalar yo'q.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-0">
            {historyOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Buyurtmalar tarixi bo'sh.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {historyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
