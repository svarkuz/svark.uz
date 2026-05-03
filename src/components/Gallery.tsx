import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GalleryDetail } from './GalleryDetail';
import { Camera, Sparkles, MapPin, ImageIcon, Maximize2, X, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const Gallery: React.FC<{ user: any, addToCart?: (product: any) => void }> = ({ user, addToCart }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const galleryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(galleryItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initial data population if empty (for demo purposes)
  useEffect(() => {
    if (!loading && items.length === 0 && user?.email === 'kidsafeuzb@gmail.com' && !isSeeding) {
      setIsSeeding(true);
      const initialImages = [
        "https://i.ibb.co/xKDDStgk/photo-2026-04-01-18-18-43.jpg", // 34 - special one (main)
        "https://i.ibb.co/CK7XZctB/photo-2026-04-10-19-59-19.jpg",
        "https://i.ibb.co/zhvffpwv/photo-2026-04-10-19-59-17.jpg",
        "https://i.ibb.co/zWscWtL3/photo-2026-01-14-22-34-35.jpg",
        "https://i.ibb.co/mF5Z8Lb5/photo-2026-04-10-19-59-15.jpg",
        "https://i.ibb.co/B5W2fxcw/photo-2026-01-14-22-34-25.jpg",
        "https://i.ibb.co/0j1wW55m/photo-2026-04-10-20-01-12.jpg",
        "https://i.ibb.co/bjJXNRJD/photo-2026-01-14-22-34-29.jpg",
        "https://i.ibb.co/xKKKyKVc/photo-2026-04-10-20-00-58.jpg",
        "https://i.ibb.co/XxDswgD1/photo-2026-01-16-08-01-04.jpg",
        "https://i.ibb.co/8DCfC5zZ/photo-2026-01-15-10-54-30.jpg",
        "https://i.ibb.co/rKFynwDy/photo-2026-04-10-20-01-18.jpg",
        "https://i.ibb.co/CKp7B6gf/photo-2026-01-14-22-34-18.jpg",
        "https://i.ibb.co/39BqC8cY/photo-2026-04-10-20-01-07.jpg",
        "https://i.ibb.co/39gGYWSH/photo-2026-01-14-22-34-19.jpg",
        "https://i.ibb.co/vgxbhLs/photo-2026-04-10-19-59-11.jpg",
        "https://i.ibb.co/JFBDhnLc/photo-2026-04-10-19-59-25-2.jpg",
        "https://i.ibb.co/HfMq9pN4/photo-2026-04-10-19-59-25.jpg",
        "https://i.ibb.co/Dgs4WGTY/photo-2026-04-10-19-59-24.jpg",
        "https://i.ibb.co/wr7yjH9b/photo-2026-04-10-19-59-23.jpg",
        "https://i.ibb.co/tPJTsFm5/photo-2026-04-10-19-59-22.jpg",
        "https://i.ibb.co/9QWJ6gb/photo-2026-04-10-20-01-16.jpg",
        "https://i.ibb.co/nND7SMzH/photo-2026-04-10-20-01-01.jpg",
        "https://i.ibb.co/zVfTb8DS/photo-2026-04-01-18-18-59.jpg",
        "https://i.ibb.co/XfCjJFt3/photo-2026-04-10-19-59-21.jpg",
        "https://i.ibb.co/Fk98bqV3/photo-2026-04-10-20-00-39.jpg",
        "https://i.ibb.co/ZRJcdrkP/photo-2026-04-10-20-01-03.jpg",
        "https://i.ibb.co/q3mFYXsh/photo-2026-04-10-20-00-32.jpg",
        "https://i.ibb.co/wrCTfzdC/photo-2026-04-01-18-18-48.jpg",
        "https://i.ibb.co/hRdR75PG/photo-2026-04-10-19-55-26.jpg",
        "https://i.ibb.co/svSmNKjh/photo-2026-03-17-15-45-02.jpg",
        "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg",
        "https://i.ibb.co/23Py9QCj/photo-2026-04-01-18-18-27.jpg",
        "https://i.ibb.co/5XNVqLzW/photo-2026-04-10-20-00-25.jpg",
        "https://i.ibb.co/6RhdbMqP/photo-2026-04-01-18-18-43.jpg",
        "https://i.ibb.co/sJNSmqLG/photo-2026-04-10-20-00-12.jpg",
        "https://i.ibb.co/W4r19rhQ/photo-2026-04-10-20-00-09.jpg",
        "https://i.ibb.co/PzGtqdx6/photo-2026-04-10-19-59-47.jpg",
        "https://i.ibb.co/1fnQb7LQ/photo-2026-04-10-19-59-43.jpg",
        "https://i.ibb.co/Kx0bm1Pv/photo-2026-04-10-19-59-40.jpg",
        "https://i.ibb.co/4Rtcmz73/photo-2026-04-10-19-59-34.jpg",
        "https://i.ibb.co/W4SmZ3st/photo-2026-04-10-19-59-32.jpg",
        "https://i.ibb.co/4w9YW4pS/photo-2026-04-10-19-59-30.jpg",
        "https://i.ibb.co/0jrBLFc6/photo-2026-04-01-18-19-04.jpg",
        "https://i.ibb.co/cSyDQLjv/photo-2026-04-10-19-59-26.jpg",
        "https://i.ibb.co/xKD2CM2d/photo-2026-04-01-18-18-34.jpg",
        "https://i.ibb.co/Q39dwLb0/photo-2026-04-10-19-59-09.jpg",
        "https://i.ibb.co/rG6qFYmg/photo-2026-04-10-19-59-08.jpg",
        "https://i.ibb.co/Wvg7gBYH/photo-2026-04-10-19-59-07.jpg",
        "https://i.ibb.co/bMTKZr6T/photo-2026-04-10-19-59-05.jpg",
        "https://i.ibb.co/N2c85tsr/photo-2026-04-10-19-59-02.jpg",
        "https://i.ibb.co/N6WLvV0t/photo-2026-04-10-19-59-00.jpg",
        "https://i.ibb.co/67Vzj3sC/photo-2026-04-10-19-58-58.jpg",
        "https://i.ibb.co/N6YQCDT8/photo-2026-04-10-19-58-57.jpg",
        "https://i.ibb.co/vtzBWrZ/photo-2026-01-09-21-22-57.jpg"
      ];

      const specialSubImages = [
        "https://i.ibb.co/cSyDQLjv/photo-2026-04-10-19-59-26.jpg", // 26
        "https://i.ibb.co/bMTKZr6T/photo-2026-04-10-19-59-05.jpg", // 49
        "https://i.ibb.co/Wvg7gBYH/photo-2026-04-10-19-59-07.jpg", // 48
        "https://i.ibb.co/Q39dwLb0/photo-2026-04-10-19-59-09.jpg", // 46
        "https://i.ibb.co/xKD2CM2d/photo-2026-04-01-18-18-34.jpg", // 45
        "https://i.ibb.co/v66qr1LM/photo-2026-04-10-19-55-22.jpg", // 31
        "https://i.ibb.co/wrCTfzdC/photo-2026-04-01-18-18-48.jpg", // 28
        "https://i.ibb.co/q3mFYXsh/photo-2026-04-10-20-00-32.jpg", // 27
        "https://i.ibb.co/cSyDQLjv/photo-2026-04-10-19-59-26.jpg", // 26 (dup)
        "https://i.ibb.co/nND7SMzH/photo-2026-04-10-20-01-01.jpg", // 22
        "https://i.ibb.co/9QWJ6gb/photo-2026-04-10-20-01-16.jpg", // 21
        "https://i.ibb.co/vgxbhLs/photo-2026-04-10-19-59-11.jpg", // 15
      ];

      initialImages.forEach(async (url, index) => {
        const itemData: any = {
          imageUrl: url,
          title: index === 0 ? "Ish jarayoni 34" : `Ish jarayoni #${index + 1}`,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'gallery'), itemData);
      });
    }
  }, [loading, items.length, user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-8 transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-white p-6 overflow-y-auto' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 flex items-center gap-3 uppercase italic">
            <Camera className="w-8 h-8 text-gold" />
            Ish jarayonlari
          </h2>
          <p className="text-gray-500 font-medium max-w-xl">Bizning ustalarimiz tomonidan bajarilgan ishlar va ish jarayonidan lavhalar.</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="rounded-[1.25rem] hover:bg-gold/5 h-14 w-14 border border-gold/10 text-gold shadow-sm transition-all active:scale-90"
        >
          {isFullScreen ? <X className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, type: 'spring', stiffness: 100 }}
            className="flex flex-col bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gold/5 group"
          >
            <div 
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => setSelectedItem(item)}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-white/95 backdrop-blur-md text-gold border border-gold/10 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">
                  SVRK
                </Badge>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-black text-gray-900 italic uppercase tracking-tighter truncate pr-2">{item.title}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 w-fit px-2 py-0.5 rounded-lg border border-gold/5">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <span className="text-[10px] font-black text-gray-900 tabular-nums">5.0</span>
                </div>
              </div>

              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (addToCart) {
                    addToCart({
                      id: item.id,
                      name: item.title,
                      imageUrl: item.imageUrl,
                      pricePerSqM: 850000,
                      category: 'gallery_design'
                    });
                  }
                }}
                className="w-full bg-gold hover:bg-gold-light text-white rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-gold/20 transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4" />
                Buyurtma berish
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedItem && (
        <GalleryDetail 
          item={selectedItem} 
          user={user} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};
