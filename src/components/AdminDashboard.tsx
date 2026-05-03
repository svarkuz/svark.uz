import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Package, Users, Settings, Shield, Camera, Trash2, Globe, Instagram, Send as TelegramIcon, MapPin, ImageIcon as ImageIconLucide, MessageSquare, Briefcase, CheckCircle2 } from 'lucide-react';
import { CustomerManager } from './CustomerManager';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const AdminDashboard: React.FC<{ 
  user: any; 
  userProfile: any;
  onAction?: (type: string, data?: any) => void 
}> = ({ user, userProfile, onAction }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [craftsmen, setCraftsmen] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any>({ telegram: '', instagram: '' });
  const [loading, setLoading] = useState(true);
  const [newGalleryItem, setNewGalleryItem] = useState({ title: '', location: '', images: [] as string[] });
  const [newCraftsman, setNewCraftsman] = useState({ name: '', bio: '', specialties: '', imageUrl: '', portfolio: [] as string[] });
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [completionImage, setCompletionImage] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Admin orders listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    const qGallery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubGallery = onSnapshot(qGallery, (snapshot) => {
      setGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Admin gallery listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'gallery');
    });

    const unsubSocial = onSnapshot(doc(db, 'settings', 'social'), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });

    const qCraftsmen = query(collection(db, 'craftsmen'), orderBy('name', 'asc'));
    const unsubCraftsmen = onSnapshot(qCraftsmen, (snapshot) => {
      setCraftsmen(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubGallery();
      unsubSocial();
      unsubCraftsmen();
    };
  }, []);

  const handleUpdateSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'social'), socialLinks);
      toast.success("Ijtimoiy tarmoqlar yangilandi");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/social');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string, additionalData: any = {}) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        ...additionalData
      });
      toast.success("Holat yangilandi");
      setCompletingOrderId(null);
      setCompletionImage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleCompletionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadingImages(true);
      const newImages: string[] = [];
      let processed = 0;

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          processed++;
          if (processed === files.length) {
            setNewGalleryItem(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
            setUploadingImages(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGalleryItem.images.length === 0) {
      toast.error("Kamida bitta rasm yuklang");
      return;
    }
    try {
      await addDoc(collection(db, 'gallery'), {
        ...newGalleryItem,
        imageUrl: newGalleryItem.images[0], // For backward compatibility
        createdAt: serverTimestamp()
      });
      setNewGalleryItem({ title: '', location: '', images: [] });
      toast.success("Ish jarayoni qo'shildi");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'gallery');
    }
  };

  const handleAddCraftsman = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'craftsmen'), {
        ...newCraftsman,
        specialties: newCraftsman.specialties.split(',').map(s => s.trim()).filter(s => s),
        rating: 5,
        reviewCount: 0,
        createdAt: serverTimestamp()
      });
      setNewCraftsman({ name: '', bio: '', specialties: '', imageUrl: '', portfolio: [] });
      toast.success("Usta qo'shildi");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'craftsmen');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-gray-100/50 p-1 rounded-2xl mb-6 flex flex-wrap gap-2 h-auto sm:h-12 overflow-x-auto border border-gold/5">
          <TabsTrigger value="orders" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-gold text-xs sm:text-sm font-bold transition-all">
            1. Ish jarayoni
          </TabsTrigger>
          {userProfile?.role === 'admin' && (
            <>
              <TabsTrigger value="gallery" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-gold text-xs sm:text-sm font-bold transition-all">
                2. Galereya
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-gold text-xs sm:text-sm font-bold transition-all">
                3. Foydalanuvchilar
              </TabsTrigger>
              <TabsTrigger value="config" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-gold text-xs sm:text-sm font-bold transition-all">
                4. Sozlamalar
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="chat" className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-gold text-xs sm:text-sm font-bold transition-all">
            {userProfile?.role === 'admin' ? '5. Chat' : '2. Chat'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Hozircha buyurtmalar yo'q</p>
            </div>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  {order.designImageUrl && (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0">
                      <img src={order.designImageUrl} alt="Design" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">{order.productName}</h3>
                        <Badge className={`${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          order.status === 'processing' ? 'bg-gold/10 text-gold font-bold' :
                          'bg-green-100 text-green-700'
                        } border-none rounded-lg px-2 text-[10px] uppercase font-black`}>
                        {order.status === 'pending' ? 'Kutilmoqda' :
                         order.status === 'processing' ? 'Jarayonda' : 'Tayyor'}
                      </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 uppercase text-[10px] font-bold">Mijoz</p>
                          <p className="font-medium italic">{order.masterName}</p>
                          <p className="text-gold font-bold">{order.masterPhone}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 uppercase text-[10px] font-bold">O'lchamlar</p>
                          <p className="font-medium">{order.width}m x {order.height}m</p>
                          <p className="text-gray-500">{order.totalArea?.toFixed(2)} m²</p>
                        </div>
                      </div>
                      {order.description && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 italic">
                          "{order.description}"
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onAction?.('chat', { senderId: order.masterId || order.userId })}
                        className="rounded-xl flex-1 py-5 border-gold/20 text-gold hover:bg-gold/5 font-black uppercase text-[10px] tracking-widest"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chatga o'tish
                      </Button>
                      {order.status === 'pending' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'processing')} className="bg-gold hover:bg-gold-light rounded-xl flex-1 py-5 shadow-lg shadow-gold/20 font-black uppercase text-[10px] tracking-widest">
                          Qabul qilish
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <div className="flex flex-col gap-2 w-full">
                          {completingOrderId === order.id ? (
                            <div className="space-y-4 p-4 bg-green-50 rounded-2xl border-2 border-dashed border-green-200">
                              <p className="text-xs font-bold text-green-700 uppercase">Tayyor ish rasmi</p>
                              {completionImage ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg group">
                                  <img src={completionImage} className="w-full h-full object-cover" />
                                  <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setCompletionImage(null)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center aspect-video rounded-xl bg-white cursor-pointer hover:bg-green-100 transition-colors border-2 border-white">
                                  <Camera className="w-8 h-8 text-green-600 mb-2" />
                                  <span className="text-xs font-bold text-green-600">Rasmga oling / Yuklang</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleCompletionImageUpload} />
                                </label>
                              )}
                              <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setCompletingOrderId(null)} className="flex-1 rounded-xl">Bekor qilish</Button>
                                <Button 
                                  disabled={!completionImage} 
                                  onClick={() => handleUpdateStatus(order.id, 'completed', { completionImageUrl: completionImage })} 
                                  className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"
                                >
                                  Tayyor deb yakunlash
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => setCompletingOrderId(order.id)} className="bg-green-600 hover:bg-green-700 rounded-xl flex-1 py-5">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Tayyor deb belgilash
                            </Button>
                          )}
                        </div>
                      )}
                      {order.status === 'completed' && order.completionImageUrl && (
                        <div className="w-full p-4 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Yakunlangan ish rasmi</p>
                          <img src={order.completionImageUrl} className="w-full h-40 object-cover rounded-xl shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter">
                  <Plus className="w-5 h-5 text-gold" />
                  Yangi ish jarayoni qo'shish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGalleryItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Loyiha nomi</Label>
                    <Input 
                      value={newGalleryItem.title} 
                      onChange={(e) => setNewGalleryItem(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Masalan: Zamonaviy darvoza o'rnatish"
                      className="rounded-xl bg-gray-50 border-none shadow-inner"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Manzil</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gold/40" />
                      <Input 
                        value={newGalleryItem.location} 
                        onChange={(e) => setNewGalleryItem(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Masalan: Toshkent sh., Yunusobod tumani"
                        className="pl-10 rounded-xl bg-gray-50 border-none shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Rasmlar</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newGalleryItem.images.map((img, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group border border-gold/10">
                          <img src={img} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setNewGalleryItem(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                      <label className="w-20 h-20 border-2 border-dashed border-gold/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 transition-colors">
                        <Camera className="w-6 h-6 text-gold/40" />
                        <span className="text-[10px] text-gold/40 font-black uppercase mt-1">Qo'shish</span>
                        <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                      </label>
                    </div>
                    {uploadingImages && <p className="text-[10px] text-gold font-black uppercase tracking-widest animate-pulse">Rasmlar yuklanmoqda...</p>}
                  </div>
                  <Button type="submit" disabled={uploadingImages} className="w-full bg-gold hover:bg-gold-light text-white py-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all">
                    Loyiha qo'shish
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-bold text-lg px-2">Mavjud ishlar</h3>
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 gap-4 pr-4">
                  {gallery.map((item) => (
                    <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                      <div className="flex gap-4 p-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold truncate">{item.title}</h4>
                          {item.location && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" /> {item.location}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-2">
                            {item.images?.length || 1} ta rasm
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm("Ushbu ishni o'chirmoqchimisiz?")) {
                              await deleteDoc(doc(db, 'gallery', item.id));
                              toast.success("O'chirildi");
                            }
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="craftsmen" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-gold" />
                  Yangi usta qo'shish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCraftsman} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Ism sharifi</Label>
                    <Input 
                      value={newCraftsman.name} 
                      onChange={(e) => setNewCraftsman(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Masalan: Umidjon Usta"
                      className="rounded-xl bg-gray-50 border-none shadow-inner"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Mutaxassisligi (vergul bilan ajrating)</Label>
                    <Input 
                      value={newCraftsman.specialties} 
                      onChange={(e) => setNewCraftsman(prev => ({ ...prev, specialties: e.target.value }))}
                      placeholder="Darvozalar, Reshotkalar, Svarka"
                      className="rounded-xl bg-gray-50 border-none shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Bio (tajribasi haqida)</Label>
                    <Textarea 
                      value={newCraftsman.bio} 
                      onChange={(e) => setNewCraftsman(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="8 yillik tajribaga ega usta..."
                      className="rounded-xl min-h-[100px] bg-gray-50 border-none shadow-inner"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gold/40 uppercase tracking-widest">Profil rasmi (URL)</Label>
                    <Input 
                      value={newCraftsman.imageUrl} 
                      onChange={(e) => setNewCraftsman(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="rounded-xl bg-gray-50 border-none shadow-inner"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-white py-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all">
                    Usta qo'shish
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-bold text-lg px-2">Mavjud ustalar</h3>
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 gap-4 pr-4">
                  {craftsmen.map((item) => (
                    <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                      <div className="flex gap-4 p-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold truncate">{item.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.bio}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{item.rating} ★</Badge>
                            <span className="text-[10px] text-gray-400">{item.reviewCount} sharh</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm("Ushbu ustani o'chirmoqchimisiz?")) {
                              await deleteDoc(doc(db, 'craftsmen', item.id));
                              toast.success("O'chirildi");
                            }
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-8">
          <CustomerManager />
        </TabsContent>

        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gold" />
                  Ijtimoiy tarmoqlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateSocial} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-black text-gold/40 uppercase tracking-widest">
                        <TelegramIcon className="w-4 h-4 text-[#229ED9]" /> Telegram
                      </Label>
                      <Input 
                        value={socialLinks.telegram} 
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, telegram: e.target.value }))}
                        placeholder="https://t.me/svark_uz"
                        className="rounded-xl bg-gray-50 border-none shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-black text-gold/40 uppercase tracking-widest">
                        <Instagram className="w-4 h-4 text-[#E4405F]" /> Instagram
                      </Label>
                      <Input 
                        value={socialLinks.instagram} 
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                        placeholder="https://www.instagram.com/svark_uz"
                        className="rounded-xl bg-gray-50 border-none shadow-inner"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-white py-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all">
                    Saqlash
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter">
                  <Users className="w-5 h-5 text-gold" />
                  Ustalar boshqaruvi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => {/* existing logic for craftsmen is separated in the code but user wants consolidated admin panel */}} 
                  variant="outline"
                  className="w-full rounded-xl py-6"
                >
                  Barcha ustalarni ko'rish
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="files">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Fayl Yuklash</h3>
            <p className="text-gray-500 mb-6">Mijozlar to'g'ridan-to'g'ri ko'rishi mumkin bo'lgan fayllarni yuklang.</p>
            <Input type="file" className="max-w-xs mx-auto rounded-xl" />
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Xabarlar</h3>
            <p className="text-gray-500">Mijozlardan kelgan barcha xabarlarni ko'rish.</p>
            <Button 
              onClick={() => onAction?.('chat')} 
              className="mt-4 bg-gold hover:bg-gold-light text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-xl shadow-gold/20 active:scale-95 transition-all"
            >
              Chatga o'tish
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white p-12 text-center">
            <TelegramIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Ovozli Buyruqlar</h3>
            <p className="text-gray-500">Ovoz orqali panellini boshqarish sozlamalari.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
