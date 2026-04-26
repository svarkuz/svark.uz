import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Camera, Save, LogOut, CheckCircle2, UserCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface ProfileSettingsProps {
  user: any;
  userProfile: any;
  onLogout?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, userProfile, onLogout }) => {
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [workplace, setWorkplace] = useState(userProfile?.workplace || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
      setPhone(userProfile.phone || '');
      setWorkplace(userProfile.workplace || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.uid) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setPhotoURL(result);
        
        // Immediate save as requested
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            photoURL: result,
            updatedAt: serverTimestamp()
          });
          toast.success("Profil rasmi yangilandi!");
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Foydalanuvchi identifikatori topilmadi");
      return;
    }
    
    setSubmitting(true);
    try {
      // Prepare the update data
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
        profileComplete: true
      };

      // Add worker specific fields if the user is a master or admin
      if (userProfile?.role === 'master' || userProfile?.role === 'admin') {
        updateData.workplace = workplace.trim();
        updateData.bio = bio.trim();
      }

      // If photoURL was changed or set
      if (photoURL !== userProfile?.photoURL) {
        updateData.photoURL = photoURL;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      toast.success("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
    } catch (error: any) {
      console.error("Firestore update error:", error);
      if (error.code === 'permission-denied') {
        toast.error("Ruxsat berilmadi. Iltimos, qaytadan tizimga kiring.");
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-900/5 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 sm:p-12 text-white">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-[2rem] bg-white/20 backdrop-blur-sm border-4 border-white overflow-hidden shadow-2xl relative">
                  {photoURL ? (
                    <>
                      <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setPhotoURL('')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-lg p-1 hover:scale-110 transition-transform"
                        title="Rasmni o'chirish"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="w-16 h-16 text-white/50" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-blue-600 rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="text-center sm:text-left space-y-2">
                <CardTitle className="text-3xl font-black">{displayName || "Mijoz Profili"}</CardTitle>
                <CardDescription className="text-blue-100 text-lg">
                  Ma'lumotlaringizni shu yerda boshqarishingiz mumkin
                </CardDescription>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none py-1.5 px-4 rounded-full font-bold">
                    ID: {user?.uid?.slice(0, 8)}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none py-1.5 px-4 rounded-full font-bold">
                    {userProfile?.role === 'master' ? 'Usta' : 'Mijoz'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 sm:p-12 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="firstName" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Ism</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ismingizni kiriting"
                    className="pl-12 pr-12 py-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 transition-all text-lg font-medium"
                  />
                  {firstName && (
                    <button 
                      onClick={() => setFirstName('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="lastName" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Familiya</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Familiyangizni kiriting"
                    className="pl-12 pr-10 py-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 transition-all text-lg font-medium"
                  />
                  {lastName && (
                    <button 
                      onClick={() => setLastName('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="displayName" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Ko'rinadigan ism</Label>
                <div className="relative">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Masalan: Azizbek"
                    className="py-6 px-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 transition-all text-lg font-medium"
                  />
                  {displayName && (
                    <button 
                      onClick={() => setDisplayName('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Telefon raqam</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="py-6 px-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 transition-all text-lg font-medium"
                  />
                  {phone && (
                    <button 
                      onClick={() => setPhone('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {userProfile?.role === 'master' && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="workplace" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Ish joyi</Label>
                    <Input
                      id="workplace"
                      value={workplace}
                      onChange={(e) => setWorkplace(e.target.value)}
                      placeholder="Masalan: Tashkent, Yunusobod"
                      className="py-6 px-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 transition-all text-lg font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <Label htmlFor="bio" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">O'zingiz haqingizda</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tajribangiz va mutaxassisligingiz haqida qisqacha ma'lumot..."
                      className="w-full min-h-[120px] p-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-400 focus:ring-blue-100 outline-none transition-all text-lg font-medium resize-none shadow-inner"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-gray-100">
              <Button 
                onClick={handleSave}
                disabled={submitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-7 rounded-2xl font-bold text-xl shadow-xl shadow-blue-200"
              >
                {submitting ? "Saqlanmoqda..." : (
                  <div className="flex items-center gap-2">
                    <Save className="w-6 h-6" />
                    Saqlash
                  </div>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={onLogout}
                className="w-full sm:w-auto border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 px-10 py-7 rounded-2xl font-bold text-xl"
              >
                <LogOut className="w-6 h-6 mr-2" />
                Chiqish
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);
