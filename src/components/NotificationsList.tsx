import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Package, CheckCircle2, Clock } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bildirishnomalar</h2>
            <p className="text-sm text-gray-500">Barcha yangiliklar va xabarlar</p>
          </div>
        </div>
        {notifications.some(n => !n.read) && (
          <Button variant="ghost" onClick={markAllAsRead} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl">
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
              className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100"
            >
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Hozircha bildirishnomalar yo'q</p>
            </motion.div>
          ) : (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card 
                  className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                    notification.read ? 'bg-white/50 opacity-75' : 'bg-white border-l-4 border-l-blue-600'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notification.type === 'new_message' ? 'bg-green-100 text-green-600' :
                      notification.type === 'new_order' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {notification.type === 'new_message' ? <MessageSquare className="w-5 h-5" /> :
                       notification.type === 'new_order' ? <Package className="w-5 h-5" /> :
                       <Bell className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-bold ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <Badge className="bg-blue-600 text-white border-none">Yangi</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.createdAt?.toDate().toLocaleString()}
                        </span>
                        {notification.read ? (
                          <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            O'qildi
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Yangi
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
