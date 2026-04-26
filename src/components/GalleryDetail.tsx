import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { generateImageDescription } from '../lib/geminiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, User, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryDetailProps {
  item: any;
  user: any;
  onClose: () => void;
}

export const GalleryDetail: React.FC<GalleryDetailProps> = ({ item, user, onClose }) => {
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
              <DialogTitle className="text-xl font-bold">{item.title}</DialogTitle>
              {item.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-blue-600" /> {item.location}
                </p>
              )}
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8">
                {/* AI Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    AI Tavsifi
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl text-gray-700 text-sm leading-relaxed border border-blue-100 italic">
                    {loadingAi ? (
                      <div className="flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        AI o'ylamoqda...
                      </div>
                    ) : (
                      aiDescription
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <div className="font-bold text-gray-900">Fikrlar ({comments.length})</div>
                  
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">{comment.userName}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {comment.createdAt?.toDate().toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-2xl rounded-tl-none">
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
            <div className="p-6 border-t bg-gray-50">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  placeholder={user ? "Fikr qoldiring..." : "Fikr qoldirish uchun kiring"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user || submittingComment}
                  className="rounded-xl bg-white"
                />
                <Button 
                  type="submit" 
                  disabled={!user || submittingComment || !newComment.trim()}
                  size="icon"
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
