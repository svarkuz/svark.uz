import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Package, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationsList: React.FC<{ 
  user: any; 
  isAdmin?: boolean;
  onAction?: (type: string, data?: any) => void 
}> = ({ user, isAdmin, onAction }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) return;

    // Listen for user-specific notifications
    const targetIds = [user.uid];
    
    // Only include broadcast notifications if user is admin/master
    if (isAdmin || user.role === 'admin' || user.role === 'master' || user.uid === 'worker_session') {
      targetIds.push('admin_broadcast');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', targetIds),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onAction) {
      onAction(notification.type, notification);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/10 shadow-sm">
            <Bell className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Bildirishnomalar</h2>
            <p className="text-sm text-gray-500 font-medium">Barcha yangiliklar va xabarlar</p>
          </div>
        </div>
        {notifications.some(n => !n.read) && (
          <Button variant="ghost" onClick={markAllAsRead} className="text-gold font-black uppercase text-[10px] tracking-widest hover:bg-gold/5 rounded-xl px-4 py-2 border border-gold/10">
            Hammasini o'qilgan deb belgilash
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-gray-50 rounded-[3rem] border border-gold/10 shadow-inner"
            >
              <Bell className="w-16 h-16 text-gold/20 mx-auto mb-6" />
              <p className="text-gray-400 font-black uppercase text-xs tracking-[0.2em]">Hozircha bildirishnomalar yo'q</p>
            </motion.div>
          ) : (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card 
                  className={`border-none shadow-sm rounded-[2rem] overflow-hidden transition-all cursor-pointer hover:shadow-xl hover:bg-white group ${
                    notification.read ? 'bg-gray-50/50 opacity-75' : 'bg-white border-l-4 border-l-gold shadow-md'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-8 flex items-start gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-gold/5 transform group-hover:scale-110 transition-transform ${
                      notification.type === 'new_message' ? 'bg-gold/10 text-gold' :
                      notification.type === 'new_order' ? 'bg-gold text-white' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {notification.type === 'new_message' ? <MessageSquare className="w-6 h-6" /> :
                       notification.type === 'new_order' ? <Package className="w-6 h-6" /> :
                       <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`font-black uppercase italic tracking-tight text-lg leading-tight ${notification.read ? 'text-gray-500' : 'text-gray-900 group-hover:text-gold transition-colors'}`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <Badge className="bg-gold text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 animate-pulse">Yangi</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-gold/40" />
                          {notification.createdAt?.toDate().toLocaleString()}
                        </span>
                        {notification.read ? (
                          <span className="flex items-center gap-2 text-gray-400 font-bold bg-gray-100 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            O'qildi
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gold font-bold bg-gold/5 px-3 py-1 rounded-full border border-gold/10">
                            <Sparkles className="w-3.5 h-3.5" />
                            Yangi Xabar
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
