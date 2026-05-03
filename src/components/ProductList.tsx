import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Ruler, User, Hammer, Droplets, Grid, PlusCircle, ArrowLeft, Camera, MapPin, Briefcase, Phone, ArrowRight, Share2, Star } from 'lucide-react';
import { OrderDialog } from './OrderDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const ProductList: React.FC<{ 
  user: any; 
  userProfile?: any;
  onOpenAI?: () => void;
  onOpenTryOn?: (imageUrl: string) => void;
  searchQuery?: string;
  addToCart?: (product: any) => void;
}> = ({ user, userProfile, onOpenAI, onOpenTryOn, searchQuery = '', addToCart }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productDetail, setProductDetail] = useState<any>(null);
  const [view, setView] = useState<'categories' | 'products' | 'custom'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  const categories = [
    { id: 'Residential Gates', name: 'Uy Darvozalari', image: "https://i.ibb.co/hFzT9dLT/61fb16de-275c-4010-aeb4-e9a747d4f967.png", color: 'bg-gold' },
    { id: 'Commercial Fences', name: "Santexnik", image: "https://i.ibb.co/DDqTHMkH/639cc0c6-d5e8-4959-98b3-8b7c89c525bc.png", color: 'bg-gold-light' },
    { id: 'Decorative Panels', name: 'Reshotka', image: "https://i.ibb.co/9QV5Ytc/2d4685cb-cefa-4883-9cdf-61b85a6ca52d.png", color: 'bg-gold' },
    { id: 'naves', name: 'Naves', image: "https://i.ibb.co/xKDDStgk/photo-2026-04-01-18-18-43.jpg", color: 'bg-gold-light' },
    { id: 'other', name: 'Boshqa narsalar', icon: PlusCircle, color: 'bg-gray-100' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = p.category === selectedCategory;
    const matchesSearch = searchQuery 
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    if (searchQuery && view === 'categories') {
      return matchesSearch;
    }
    
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (searchQuery && view === 'categories') {
      setView('products');
    }
  }, [searchQuery, view]);

  const handleCategoryClick = (catId: string) => {
    if (catId === 'other') {
      if (onOpenAI) onOpenAI();
      return;
    }
    setSelectedCategory(catId);
    setView('products');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {user && (
        <div className="p-8 bg-gray-50 rounded-[2.5rem] shadow-inner border border-gold/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-gold/20 shadow-sm relative group">
              <div className="absolute inset-0 bg-gold opacity-0 group-hover:opacity-10 transition-opacity" />
              {userProfile?.photoURL || user.photoURL ? (
                <img src={userProfile?.photoURL || user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gold/40" />
              )}
            </div>
            <div>
              <h3 className="font-black text-xl italic uppercase tracking-tight text-gray-900">Mijoz paneli</h3>
              <p className="text-gray-500 font-medium">Xush kelibsiz, <span className="text-gold">{(userProfile?.displayName || user.displayName)?.toLowerCase()}</span>!</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger className="hidden sm:flex flex-col items-end text-right group">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest group-hover:text-gold transition-colors">Usta bilan bog'lanish</span>
                <span className="text-gold font-black italic tracking-tighter uppercase text-lg group-hover:scale-105 transition-transform">UMID: +998 90 932 39 92</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] rounded-[3rem] p-0 border border-gold/20 overflow-hidden bg-white shadow-2xl">
                <div className="bg-gold p-10 text-white relative">
                  <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                    <User className="w-8 h-8" />
                    Usta Ma'lumoti
                  </DialogTitle>
                </div>
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-[2rem] border border-gold/10 shadow-inner">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden ring-2 ring-white">
                      <img src="https://i.ibb.co/rGStjV9t/photo-2026-04-19-13-06-56.jpg" alt="Usta" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-tight">Umidjon Usta</h4>
                      <p className="text-gold font-black uppercase text-[10px] tracking-widest mt-1">Professional payvandlovchi</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { icon: <MapPin className="w-5 h-5 text-gold" />, label: "Shahar", value: "Toshkent viloyati" },
                      { icon: <Briefcase className="w-5 h-5 text-gold" />, label: "Tajriba", value: "8 yildan ko'p" },
                      { icon: <Hammer className="w-5 h-5 text-gold" />, label: "Sohasi", value: "Darvoza, Reshotka, Naves" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gold/5 group hover:border-gold/20 transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{item.label}</p>
                          <p className="font-black text-gray-900 uppercase italic tracking-tighter text-sm">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <a href="tel:+998909323992" className="w-full block">
                      <Button className="w-full bg-gold hover:bg-gold-light text-white h-18 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl shadow-gold/20 flex gap-3 transform active:scale-[0.98] transition-all">
                        <Phone className="w-6 h-6" />
                        +998 90 932 39 92
                      </Button>
                    </a>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge className="bg-white text-gold border border-gold/20 px-5 py-2 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm italic">
              Tizimda faol
            </Badge>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'categories' ? (
          <motion.div 
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Mahsulot turlari</h2>
              <p className="text-gray-500">Katalogimizdan o'zingizga kerakli bo'limni tanlang.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((cat) => (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.02, translateY: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="group relative cursor-pointer aspect-square rounded-[2rem] overflow-hidden shadow-lg border border-gray-100/50"
                >
                  <div className="absolute inset-0 z-0">
                    {cat.image ? (
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full ${cat.color} flex items-center justify-center`}>
                        {cat.icon && <cat.icon className="w-12 h-12 text-white/80" />}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent group-hover:from-gold/90 group-hover:via-gold/40 transition-colors duration-500" />
                  <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
                    <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter mb-2 leading-tight">{cat.name}</h3>
                    <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                      {cat.id === 'other' ? "AI Assistant" : "DIGI CATALOG"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setView('categories')}
                className="rounded-2xl gap-2 hover:bg-gold/5 text-gray-500 hover:text-gold font-black uppercase text-[10px] tracking-widest px-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </Button>
              <Button 
                onClick={() => setView('custom')}
                className="bg-gold hover:bg-gold-light text-white rounded-2xl gap-2 shadow-xl shadow-gold/20 font-black uppercase text-[10px] tracking-widest px-8"
              >
                <PlusCircle className="w-4 h-4" />
                Maxsus buyurtma
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                {categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-gray-500">Tayyor dizaynlar orasidan tanlang yoki o'z dizayningizni taklif qiling.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md text-gold border-none shadow-xl hover:bg-gold hover:text-white transition-all transform active:scale-90"
                          onClick={() => addToCart?.(product)}
                        >
                          <ShoppingCart className="w-6 h-6" />
                        </Button>
                        <Badge className="bg-white/95 backdrop-blur-md text-gold border border-gold/10 font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest shadow-sm">
                          {product.category === 'gate' ? 'Darvoza' : 
                           product.category === 'decorative' ? 'Reshotka' : 
                           product.category === 'railing' ? 'Santexnik' : 
                           product.category === 'naves' ? 'Naves' : 'Boshqa'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4 flex flex-col flex-1 cursor-pointer" onClick={() => setProductDetail(product)}>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter leading-tight group-hover:text-gold transition-colors">
                            {product.name}
                          </h3>
                          <button className="text-gold/20 hover:text-gold transition-colors shrink-0">
                            <span className="sr-only">Share</span>
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-500 leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gold/5 w-fit">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-gold fill-gold" />)}
                        </div>
                        <span className="text-[10px] font-black text-gray-900 tabular-nums">5.0</span>
                      </div>

                      <div className="pt-2">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart?.(product);
                          }}
                          className="w-full bg-gold hover:bg-gold-light text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-gold/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                          <ShoppingCart className="w-5 h-5" />
                          Buyurtma Berish
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusCircle className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Mahsulotlar topilmadi</h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto">Siz xohlagan dizaynni AI orqali yaratishimiz yoki maxsus buyurtma qabul qilishimiz mumkin.</p>
                  <Button 
                    onClick={() => setView('custom')}
                    className="mt-8 bg-gold hover:bg-gold-light text-white rounded-2xl px-10 py-8 text-xl font-black italic uppercase tracking-widest shadow-xl shadow-gold/20 active:scale-95 transition-all"
                  >
                    Maxsus buyurtma berish
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!productDetail} onOpenChange={() => setProductDetail(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          {productDetail && (
              <div className="flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="shrink-0">
                  <div className="aspect-video relative overflow-hidden bg-gray-100 group/zoom">
                    <img src={productDetail.imageUrl} alt={productDetail.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                      <Badge className="bg-white/90 text-gold border-none font-black py-2 px-4 rounded-xl text-xs uppercase tracking-widest">
                        {productDetail.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {productDetail.images && productDetail.images.length > 0 && (
                    <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50 border-b scrollbar-hide">
                      {[productDetail.imageUrl, ...productDetail.images].map((img: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm cursor-pointer hover:border-gold transition-colors"
                          onClick={() => setProductDetail({...productDetail, imageUrl: img})}
                        >
                          <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-8 sm:p-10 space-y-8">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">{productDetail.name}</h2>
                    <div className="w-20 h-2 bg-gold rounded-full mt-4 shadow-sm" />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-gold uppercase tracking-[0.3em] border-l-4 border-gold pl-3">Mahsulot Haqida</h4>
                       <p className="text-gray-600 text-lg leading-relaxed font-medium italic">{productDetail.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gold/5 shadow-inner">
                        <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest mb-1">Material</p>
                        <p className="font-black text-gray-900 uppercase italic tracking-tighter">{productDetail.material || 'Yuqori sifatli temir'}</p>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gold/5 shadow-inner">
                        <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest mb-1">Bo'yoq</p>
                        <p className="font-black text-gray-900 uppercase italic tracking-tighter">Kukunli (Antik-bronza)</p>
                      </div>
                      {productDetail.dimensions && (
                        <div className="col-span-1 sm:col-span-2 p-6 bg-gold/5 rounded-[2rem] border border-gold/10 flex justify-between items-center shadow-inner">
                          <div>
                            <p className="text-[10px] font-black text-gold/40 uppercase tracking-widest mb-1">O'lchamlar</p>
                            <p className="font-black text-gray-900 uppercase italic tracking-tighter text-lg">
                              {productDetail.dimensions.height}m x {productDetail.dimensions.width}m 
                              {productDetail.dimensions.depth ? ` x ${productDetail.dimensions.depth}m` : ''}
                            </p>
                          </div>
                          <Ruler className="w-8 h-8 text-gold" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-4">
                    <Button 
                      onClick={() => {
                        addToCart?.(productDetail);
                        setProductDetail(null);
                      }}
                      className="flex-1 bg-gold hover:bg-gold-light text-white py-10 rounded-[2rem] text-xl font-black italic uppercase tracking-widest shadow-xl shadow-gold/20 transition-all active:scale-95"
                    >
                      SAVATGA QO'SHISH
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedProduct(productDetail);
                        setProductDetail(null);
                      }}
                      variant="outline"
                      className="flex-1 py-10 rounded-[2rem] text-xl font-black italic uppercase tracking-widest border-2 border-gold/10 text-gold hover:bg-gold/5 transition-all shadow-sm"
                    >
                      BUYURTMA BERISH
                    </Button>
                  </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(selectedProduct || view === 'custom') && (
        <OrderDialog 
          product={selectedProduct} 
          initialCategory={categories.find(c => c.id === selectedCategory)?.name}
          user={user} 
          onClose={() => {
            setSelectedProduct(null);
            if (view === 'custom') setView('products');
          }} 
        />
      )}
    </div>
  );
};

