import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Shield, Search, Filter, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  createdAt: any;
  profileComplete?: boolean;
}

export const CustomerManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.phone?.includes(searchQuery) ||
      user.uid.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            MIJOZLAR RO'YXATI
          </h2>
          <p className="text-gray-500 font-medium">Barcha ro'yxatdan o'tgan foydalanuvchilar</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group shadow-sm transition-shadow hover:shadow-md rounded-2xl overflow-hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <Input 
              placeholder="Ism yoki telefon..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-14 w-full sm:w-[300px] border-none bg-white rounded-2xl font-medium focus-visible:ring-2 focus-visible:ring-blue-600"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-14 w-full sm:w-[180px] border-none bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow font-medium px-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <SelectValue placeholder="Rol boyicha" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
              <SelectItem value="all" className="rounded-xl h-10 px-4">Barchasi</SelectItem>
              <SelectItem value="customer" className="rounded-xl h-10 px-4">Mijozlar</SelectItem>
              <SelectItem value="admin" className="rounded-xl h-10 px-4">Adminlar</SelectItem>
              <SelectItem value="master" className="rounded-xl h-10 px-4">Ustalar</SelectItem>
              <SelectItem value="worker" className="rounded-xl h-10 px-4">Ishchilar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredUsers.map((user) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <Card className="rounded-3xl border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all h-full bg-white relative">
                <div className={`h-2 w-full ${
                  user.role === 'admin' ? 'bg-red-500' : 
                  user.role === 'master' || user.role === 'worker' ? 'bg-blue-600' : 
                  'bg-green-500'
                }`} />
                <CardHeader className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform ${
                        user.role === 'admin' ? 'bg-red-50' : 
                        user.role === 'master' || user.role === 'worker' ? 'bg-blue-50' : 
                        'bg-green-50'
                      }`}>
                        <User className={`w-7 h-7 ${
                          user.role === 'admin' ? 'text-red-600' : 
                          user.role === 'master' || user.role === 'worker' ? 'text-blue-600' : 
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900 leading-tight">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
                            : (user.displayName || "Nomsiz Foydalanuvchi")}
                        </CardTitle>
                        <Badge variant="secondary" className={`rounded-full px-3 py-1 font-bold text-[10px] uppercase mt-2 border-none ${
                          user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                          user.role === 'master' || user.role === 'worker' ? 'bg-blue-100 text-blue-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl transition-colors group-hover:bg-gray-100 border border-transparent group-hover:border-gray-200">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Telefon</p>
                        <p className="font-bold text-gray-900">{user.phone || "Kiritilmagan"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl transition-colors group-hover:bg-gray-100 border border-transparent group-hover:border-gray-200">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">ID raqami</p>
                        <p className="font-mono text-[10px] text-gray-500 truncate max-w-[150px]">{user.uid}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       Ro'yxat: {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Yaqinda'}
                    </p>
                    {user.profileComplete && (
                      <Badge className="bg-blue-600 text-white border-none rounded-lg px-2 text-[8px] font-black">ACTIVE</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900">Mijozlar topilmadi</h3>
          <p className="text-gray-500 mt-2">Qidiruv kriteriyalarini o'zgartirib ko'ring</p>
        </div>
      )}
    </div>
  );
};
