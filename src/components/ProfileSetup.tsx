import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Check, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSetupProps {
  user: any;
  onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        phone,
        photoURL,
        uid: user.uid,
        role: user.role || 'customer',
        displayName: `${firstName} ${lastName}`,
        profileComplete: true
      }, { merge: true });
      toast.success("Profilingiz muvaffaqiyatli saqlandi!");
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error("Xatolik yuz berdi. Iltimos qaytadan urunib ko'ring.");
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md border border-gold/5 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
        <CardHeader className="bg-gold text-white p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardTitle className="text-3xl font-black italic uppercase tracking-tighter relative z-10">Profilni to'ldiring</CardTitle>
          <CardDescription className="text-white/80 font-medium italic mt-2 relative z-10">
            Ilovadan to'liq foydalanish uchun ma'lumotlaringizni kiriting.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="relative group">
                <div className="w-28 h-28 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gold/20 overflow-hidden flex items-center justify-center group-hover:border-gold/40 transition-colors">
                  {photoURL ? (
                    <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gold/20" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-gold text-white rounded-xl shadow-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform border-4 border-white">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Profil rasmi</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Ism</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Hasan"
                  required
                  className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Familiya</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Aliyev"
                  required
                  className="rounded-2xl bg-gray-50 border-none h-14 px-5 focus-visible:ring-gold/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Telefon raqam</Label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/40" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998"
                  required
                  className="pl-12 rounded-2xl bg-gray-50 border-none h-14 focus-visible:ring-gold/20"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-white h-16 rounded-[1.5rem] text-sm font-black uppercase tracking-widest gap-3 shadow-xl shadow-gold/20 active:scale-95 transition-all"
            >
              {loading ? 'Saqlanmoqda...' : (
                <>
                  <Check className="w-5 h-5" />
                  Saqlash va davom etish
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
