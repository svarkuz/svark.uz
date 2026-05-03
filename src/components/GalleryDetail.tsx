import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { generateImageDescription } from '../lib/geminiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, User, Clock, MapPin, ChevronLeft, ChevronRight, ShoppingBag, ShoppingCart } from 'lucide-react';

interface GalleryDetailProps {
  item: any;
  user: any;
  onClose: () => void;
  addToCart?: (product: any) => void;
}

export const GalleryDetail: React.FC<GalleryDetailProps> = ({ item, user, onClose, addToCart }) => {
  const [aiDescription, setAiDescription] = useState(item.aiDescription || '');
  const [loadingAi, setLoadingAi] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = item.images || [item.imageUrl];

  useEffect(() => {
    if (!item.aiDescription && !aiDescription) {
      handleGenerateAiDescription();
    }
  }, [item.id]);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('galleryItemId', '==', item.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [item.id]);

  const handleGenerateAiDescription = async () => {
    setLoadingAi(true);
    const desc = await generateImageDescription(item.imageUrl);
    setAiDescription(desc);
    
    // Save to Firestore if admin
    if (user?.role === 'admin') {
      try {
        await updateDoc(doc(db, 'gallery', item.id), { aiDescription: desc });
      } catch (error) {
        console.error("Error saving AI description:", error);
      }
    }
    setLoadingAi(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        galleryItemId: item.id,
        userId: user.uid,
        userName: user.displayName || 'Mijoz',
        text: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Image Section */}
          <div className="lg:w-3/5 bg-black flex items-center justify-center relative group">
            <img
              src={images[currentImageIndex]}
              alt={item.title}
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
            
            {images.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_: any, i: number) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info Section */}
          <div className="lg:w-2/5 flex flex-col bg-white h-full">
            <DialogHeader className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                   <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{item.title}</DialogTitle>
                   {item.location && (
                     <p className="text-sm text-gray-500 font-bold flex items-center gap-1 mt-1">
                       <MapPin className="w-3 h-3 text-gold" /> {item.location}
                     </p>
                   )}
                 </div>
                 <Button 
                   onClick={() => {
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
                   className="bg-gold hover:bg-gold-light text-white rounded-[1.25rem] h-12 px-6 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-gold/20 transition-all active:scale-95"
                 >
                   <ShoppingCart className="w-4 h-4" />
                   Buyurtma berish
                 </Button>
               </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8">
                {/* AI Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-[0.3em]">
                    <Sparkles className="w-4 h-4" />
                    AI Tavsifi
                  </div>
                  <div className="p-6 bg-gray-50 rounded-[2rem] text-gray-600 text-sm leading-relaxed border border-gold/5 italic font-medium shadow-inner relative group/ai">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gold/20 rounded-full" />
                    {loadingAi ? (
                      <div className="flex items-center gap-3 animate-pulse">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span className="font-black uppercase text-[10px] tracking-widest text-gold/40">AI o'ylamoqda...</span>
                      </div>
                    ) : (
                      aiDescription
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-6">
                  <div className="font-black text-gray-900 uppercase italic tracking-tight text-sm flex items-center justify-between">
                    <span>Fikrlar ({comments.length})</span>
                  </div>
                  
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gold/5 border border-gold/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <User className="w-5 h-5 text-gold/30" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{comment.userName}</span>
                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              {comment.createdAt?.toDate().toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-[1.5rem] rounded-tl-none border border-gold/5 font-medium leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-8 border-t bg-white">
              <form onSubmit={handleAddComment} className="flex gap-3">
                <Input
                  placeholder={user ? "Fikr qoldiring..." : "Fikr qoldirish uchun kiring"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user || submittingComment}
                  className="h-14 rounded-2xl bg-gray-50 border-none px-6 focus-visible:ring-1 focus-visible:ring-gold/20 shadow-inner placeholder:text-gray-400 font-medium"
                />
                <Button 
                  type="submit" 
                  disabled={!user || submittingComment || !newComment.trim()}
                  size="icon"
                  className="bg-gold hover:bg-gold-light rounded-2xl h-14 w-14 flex-shrink-0 shadow-lg shadow-gold/20 transition-all active:scale-90"
                >
                  <Send className="w-5 h-5 text-white" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
