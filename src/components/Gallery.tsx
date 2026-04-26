import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GalleryDetail } from './GalleryDetail';
import { Camera, Sparkles, MapPin, ImageIcon, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

export const Gallery: React.FC<{ user: any }> = ({ user }) => {
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

      initialImages.forEach(async (url, index) => {
        await addDoc(collection(db, 'gallery'), {
          imageUrl: url,
          title: `Ish jarayoni #${index + 1}`,
          createdAt: serverTimestamp()
        });
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Camera className="w-8 h-8 text-blue-600" />
            Ish jarayonlari
          </h2>
          <p className="text-gray-500">Bizning ustalarimiz tomonidan bajarilgan ishlar va ish jarayonidan lavhalar.</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="rounded-xl hover:bg-gray-100"
        >
          {isFullScreen ? <X className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="group relative aspect-square overflow-hidden border-none cursor-pointer rounded-2xl shadow-sm hover:shadow-xl transition-all"
              onClick={() => setSelectedItem(item)}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <div className="text-white space-y-1">
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  {item.location && (
                    <p className="text-[10px] flex items-center gap-1 opacity-80">
                      <MapPin className="w-3 h-3" /> {item.location}
                    </p>
                  )}
                  {item.images?.length > 1 && (
                    <p className="text-[10px] flex items-center gap-1 opacity-80">
                      <ImageIcon className="w-3 h-3" /> {item.images.length} ta rasm
                    </p>
                  )}
                </div>
              </div>
            </Card>
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
