import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Ruler, User, Hammer, Droplets, Grid, PlusCircle, ArrowLeft, Camera, MapPin, Briefcase, Phone, ArrowRight, Share2 } from 'lucide-react';
import { OrderDialog } from './OrderDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const ProductList: React.FC<{ 
  user: any; 
  onOpenAI?: () => void;
  onOpenTryOn?: (imageUrl: string) => void;
  searchQuery?: string;
  addToCart?: (product: any) => void;
}> = ({ user, onOpenAI, onOpenTryOn, searchQuery = '', addToCart }) => {
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
    { id: 'Residential Gates', name: 'Uy Darvozalari', image: "https://i.ibb.co/hFzT9dLT/61fb16de-275c-4010-aeb4-e9a747d4f967.png", color: 'bg-blue-600', orderImage: "https://i.ibb.co/9QV5Ytc/2d4685cb-cefa-4883-9cdf-61b85a6ca52d.png" },
    { id: 'Commercial Fences', name: "Sanoat To'siqlari", image: "https://i.ibb.co/DDqTHMkH/639cc0c6-d5e8-4959-98b3-8b7c89c525bc.png", color: 'bg-indigo-600', orderImage: "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg" },
    { id: 'Decorative Panels', name: 'Dekorativ Panellar', image: "https://i.ibb.co/9QV5Ytc/2d4685cb-cefa-4883-9cdf-61b85a6ca52d.png", color: 'bg-cyan-600', orderImage: "https://i.ibb.co/hFzT9dLT/61fb16de-275c-4010-aeb4-e9a747d4f967.png" },
    { id: 'naves', name: 'Naves', image: "https://i.ibb.co/20PT75w1/b4d3cf6e-8066-40e1-a310-53c7c5c00a07.jpg", color: 'bg-amber-600', orderImage: "https://i.ibb.co/hRdR75PG/photo-2026-04-10-19-55-26.jpg" },
    { id: 'other', name: 'Boshqa narsalar', icon: PlusCircle, color: 'bg-gray-600' },
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
    const cat = categories.find(c => c.id === catId);
    setSelectedCategory(catId);
    
    setProductDetail({
      id: 'custom-' + catId,
      name: cat?.name || 'Maxsus buyurtma',
      imageUrl: cat?.orderImage || cat?.image,
      fullImage: cat?.image,
      category: catId,
      description: `${cat?.name} bo'yicha maxsus buyurtma berish. Bu bo'limda siz xohlagan o'lchamdagi va dizayndagi mahsulotga buyurtma bera olasiz.`
    });
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
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">Mijoz paneli</h3>
              <p className="text-sm text-gray-500">Xush kelibsiz, {user.displayName}!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger className="hidden sm:flex flex-col items-end text-right hover:opacity-80 transition-opacity">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Usta bilan bog'lanish</span>
                <span className="text-blue-600 font-bold">UMID: +998 90 932 39 92</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6 text-blue-600" />
                    Usta haqida ma'lumot
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                      <img src="https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg" alt="Usta" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">Umidjon Usta</h4>
                      <p className="text-blue-600 font-medium tracking-tight">Professional payvandlovchi</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <MapPin className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Shahar</p>
                        <p className="font-bold text-gray-900">Toshkent viloyati</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Tajriba</p>
                        <p className="font-bold text-gray-900">8 yildan ko'p</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Hammer className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Mutaxassislik</p>
                        <p className="font-bold text-gray-900">Darvoza, Reshotka, Naves</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <a href="tel:+998909323992" className="w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl font-bold flex gap-2">
                        <Phone className="w-5 h-5" />
                        Bog'lanish: +998 90 932 39 92
                      </Button>
                    </a>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge className="bg-green-100 text-green-700 border-none px-4 py-1.5 rounded-full">
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
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-blue-900/90 group-hover:via-blue-900/40 transition-colors duration-500" />
                  <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
                    <h3 className="text-lg sm:text-xl font-black mb-1 leading-tight">{cat.name}</h3>
                    <p className="text-[10px] sm:text-xs text-white/70 font-bold uppercase tracking-widest flex items-center gap-1">
                      {cat.id === 'other' ? "AI Assistant" : "Catalog"}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
                className="rounded-xl gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </Button>
              <Button 
                onClick={() => setView('custom')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-lg shadow-blue-200"
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
                          className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md text-blue-600 border-none shadow-lg hover:bg-white"
                          onClick={() => addToCart?.(product)}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </Button>
                        <Badge className="bg-white/90 backdrop-blur-md text-blue-600 border-none font-bold py-2">
                          {product.category === 'gate' ? 'Darvoza' : 
                           product.category === 'decorative' ? 'Reshotka' : 
                           product.category === 'railing' ? 'Santexnik' : 
                           product.category === 'naves' ? 'Naves' : 'Boshqa'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4 flex flex-col flex-1 cursor-pointer" onClick={() => setProductDetail(product)}>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                      </div>
                      
                      {/* Price removed as per user request */}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart?.(product);
                          }}
                          variant="outline"
                          className="rounded-2xl h-12 font-bold border-2 border-blue-50 text-blue-600 hover:bg-blue-50"
                        >
                          Savatga
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 font-bold shadow-lg shadow-blue-200"
                        >
                          Buyurtma
                        </Button>
                      </div>

                      <Button 
                        variant="ghost"
                        onClick={() => {
                          const url = window.location.href;
                          navigator.clipboard.writeText(`Svark_uz: ${product.name} - ${url}`);
                          toast.success("Havola nusxalandi!");
                        }}
                        className="w-full text-[10px] text-gray-400 hover:text-blue-600 font-bold uppercase tracking-widest gap-2"
                      >
                        <Share2 className="w-3 h-3" />
                        Do'stlarga ulashish
                      </Button>
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
                    className="mt-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-10 py-6 text-lg font-bold shadow-xl shadow-blue-200"
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
                      <Badge className="bg-white/90 text-blue-600 border-none font-bold py-2 px-4 rounded-xl text-sm">
                        {productDetail.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {productDetail.images && productDetail.images.length > 0 && (
                    <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50 border-b scrollbar-hide">
                      {[productDetail.imageUrl, ...productDetail.images].map((img: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
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
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{productDetail.name}</h2>
                    <div className="w-20 h-1.5 bg-blue-600 rounded-full mt-4" />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Mahsulot Haqida</h4>
                       <p className="text-gray-600 text-lg leading-relaxed">{productDetail.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Material</p>
                        <p className="font-bold text-gray-900">{productDetail.material || 'Yuqori sifatli temir'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Bo'yoq</p>
                        <p className="font-bold text-gray-900">Kukunli (Antik-bronza)</p>
                      </div>
                      {productDetail.dimensions && (
                        <div className="col-span-1 sm:col-span-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase">O'lchamlar</p>
                            <p className="font-bold text-blue-900">
                              {productDetail.dimensions.height}m x {productDetail.dimensions.width}m 
                              {productDetail.dimensions.depth ? ` x ${productDetail.dimensions.depth}m` : ''}
                            </p>
                          </div>
                          <Ruler className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end p-6 bg-blue-50 rounded-3xl border border-blue-100 shadow-inner">
                    <div className="text-right">
                      <span className="text-xs text-blue-400 uppercase font-black tracking-widest">Narx</span>
                      <p className="font-black text-blue-800 text-xl">
                        {productDetail.price ? `${productDetail.price.toLocaleString()} so'm` : 'Usta hisoblaydi'}
                      </p>
                    </div>
                  </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    onClick={() => {
                      addToCart?.(productDetail);
                      setProductDetail(null);
                    }}
                    variant="outline"
                    className="flex-1 py-8 rounded-2xl text-lg font-bold border-2 border-blue-100 text-blue-600 hover:bg-blue-50"
                  >
                    Savatga qo'shish
                  </Button>
                  <Button 
                    onClick={() => {
                      setSelectedProduct(productDetail);
                      setProductDetail(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-8 rounded-2xl text-lg font-bold shadow-xl shadow-blue-200 transition-all active:scale-95"
                  >
                    MAXSUS BUYURTMA BERISH
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

