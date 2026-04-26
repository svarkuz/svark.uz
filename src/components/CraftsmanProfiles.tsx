import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Star, User, Briefcase, Image as ImageIcon, MessageSquare, Plus, X, StarHalf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface Craftsman {
  id: string;
  name: string;
  bio: string;
  portfolio: string[];
  rating: number;
  reviewCount: number;
  specialties: string[];
  imageUrl?: string;
}

interface Review {
  id: string;
  craftsmanId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface CraftsmanProfilesProps {
  user: any;
}

export const CraftsmanProfiles: React.FC<CraftsmanProfilesProps> = ({ user }) => {
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([]);
  const [selectedCraftsman, setSelectedCraftsman] = useState<Craftsman | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'craftsmen'), where('name', '==', 'Umidjon Usta'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Craftsman));
      setCraftsmen(data);
      if (data.length > 0) {
        setSelectedCraftsman(data[0]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedCraftsman) {
      const q = query(
        collection(db, 'reviews'),
        where('craftsmanId', '==', selectedCraftsman.id),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(data);
      });
      return () => unsubscribe();
    }
  }, [selectedCraftsman]);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Sharh qoldirish uchun tizimga kiring");
      return;
    }
    if (!newReview.comment.trim()) {
      toast.error("Sharh matnini kiriting");
      return;
    }

    try {
      await addDoc(collection(db, 'reviews'), {
        craftsmanId: selectedCraftsman?.id,
        userId: user.uid,
        userName: user.displayName || 'Mijoz',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: serverTimestamp()
      });

      // Update craftsman rating (simplified average update)
      const craftsmanRef = doc(db, 'craftsmen', selectedCraftsman!.id);
      const newReviewCount = (selectedCraftsman?.reviewCount || 0) + 1;
      const newRating = ((selectedCraftsman?.rating || 0) * (selectedCraftsman?.reviewCount || 0) + newReview.rating) / newReviewCount;
      
      await updateDoc(craftsmanRef, {
        rating: Number(newRating.toFixed(1)),
        reviewCount: newReviewCount
      });

      setNewReview({ rating: 5, comment: '' });
      toast.success("Sharhingiz qabul qilindi");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Xatolik yuz berdi");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm font-bold text-gray-700">{rating}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {craftsmen.map((craftsman) => (
          <motion.div
            key={craftsman.id}
            layoutId={`craftsman-${craftsman.id}`}
            onClick={() => setSelectedCraftsman(craftsman)}
            className="group cursor-pointer"
          >
            <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={craftsman.imageUrl || `https://picsum.photos/seed/${craftsman.id}/800/600`}
                  alt={craftsman.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex flex-wrap gap-2">
                    {craftsman.specialties.slice(0, 2).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold rounded-lg text-blue-600 uppercase tracking-wider">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors">{craftsman.name}</CardTitle>
                  {renderStars(craftsman.rating)}
                </div>
                <CardDescription className="line-clamp-2 mt-1">{craftsman.bio}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{craftsman.reviewCount || 0} sharhlar</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedCraftsman && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCraftsman(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`craftsman-${selectedCraftsman.id}`}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedCraftsman(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <X className="w-6 h-6 text-gray-900" />
              </button>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
                          <img
                            src={selectedCraftsman.imageUrl || `https://picsum.photos/seed/${selectedCraftsman.id}/200/200`}
                            alt={selectedCraftsman.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-gray-900">{selectedCraftsman.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(selectedCraftsman.rating)}
                            <span className="text-sm text-gray-400">({selectedCraftsman.reviewCount} sharh)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedCraftsman.specialties.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Mutaxassis haqida
                        </h4>
                        <p className="text-gray-600 leading-relaxed">{selectedCraftsman.bio}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-8 border-l border-gray-100 flex flex-col h-full">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Mijozlar fikri
                    </h4>

                    <div className="space-y-4 flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-gray-900">{review.userName}</span>
                            {renderStars(review.rating)}
                          </div>
                          <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Yaqinda'}
                          </span>
                        </div>
                      ))}
                      {reviews.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                          <p className="text-sm">Hozircha sharhlar yo'q</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4">
                      <h5 className="font-bold text-gray-900 text-sm">Sharh qoldirish</h5>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setNewReview({ ...newReview, rating: s })}
                            className="focus:outline-none"
                          >
                            <Star className={`w-6 h-6 ${s <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        placeholder="Fikringizni yozing..."
                        className="min-h-[80px] rounded-2xl border-gray-100 focus:ring-blue-500"
                      />
                      <Button onClick={handleSubmitReview} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                        Yuborish
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
