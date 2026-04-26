import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Ruler, 
  Calculator, 
  Phone, 
  User, 
  Image as ImageIcon, 
  MapPin, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Hammer, 
  ShieldCheck, 
  Box,
  CheckCircle2,
  Settings2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface OrderDialogProps {
  product?: any;
  user: any;
  onClose: () => void;
  initialCategory?: string;
}

const styles = [
  { id: 'modern', name: 'Zamonaviy (Modern)', description: 'Minimalist va tekis chiziqlar', icon: '✨' },
  { id: 'classic', name: 'Klassik', description: 'Vaqt sinovidan o\'tgan naqshlar', icon: '🏛️' },
  { id: 'baroque', name: 'Barokko', description: 'Boy va murakkab detallar', icon: '⚜️' },
  { id: 'minimalist', name: 'Minimalist', description: 'Oddiy va funksional', icon: '⬜' },
  { id: 'industrial', name: 'Industrial (Loft)', description: 'Xom va mustahkam ko\'rinish', icon: '🏭' },
  { id: 'ornate', name: 'Hashamatli (Ornate)', description: 'Maksimal darajadagi bezaklar', icon: '👑' },
];

const materials = [
  { id: 'steel', name: 'Po\'lat (Steel)', description: 'Mustahkam va universal', quality: 'Yuqori' },
  { id: 'iron', name: 'Cho\'yan (Cast Iron)', description: 'Og\'ir va bardoshli', quality: 'Premium' },
  { id: 'aluminum', name: 'Alyuminiy', description: 'Zanglamaydigan va yengil', quality: 'O\'rta' },
  { id: 'stainless', name: 'Zanglamas po\'lat', description: 'Abadiy ko\'rinish', quality: 'Luxe' },
];

const features = [
  { id: 'auto', name: 'Avtomatika (motor)', icon: Settings2 },
  { id: 'intercom', name: 'Domofon o\'rnatish', icon: Phone },
  { id: 'mailbox', name: 'Pochta qutisi', icon: FileText },
  { id: 'gold', name: 'Oltin rangli detallar', icon: Sparkles },
  { id: 'galvanized', name: 'Ruxlash (Galvanized)', icon: ShieldCheck },
];

export const OrderDialog: React.FC<OrderDialogProps> = ({ product, user, onClose, initialCategory }) => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [locationType, setLocationType] = useState('home');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [style, setStyle] = useState(product?.style || 'modern');
  const [material, setMaterial] = useState('steel');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [designImage, setDesignImage] = useState<string | null>(product?.imageUrl || null);
  const [siteImage, setSiteImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalArea = Number(width) * Number(height);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      toast.error("Iltimos, barcha majburiy maydonlarni to'ldiring");
      return;
    }

    setSubmitting(true);
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        productId: product?.id || 'custom',
        productName: product?.name || initialCategory || 'Maxsus buyurtma',
        masterId: user.uid,
        masterName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        masterPhone: phone,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        totalArea: totalArea || null,
        designImageUrl: designImage,
        siteImageUrl: siteImage,
        locationType,
        address,
        paymentMethod,
        style,
        material,
        customFeatures: selectedFeatures,
        description,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Notify admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin_broadcast',
        type: 'new_order',
        message: `Yangi buyurtma: ${firstName} ${lastName} dan. Uslub: ${style}`,
        orderId: orderRef.id,
        createdAt: serverTimestamp(),
        read: false
      });

      toast.success("Buyurtmangiz qabul qilindi! Tez orada aloqaga chiqamiz.");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-gray-500">Dizayn uslubini tanlang</Label>
              <div className="grid grid-cols-2 gap-3">
                {styles.map((s) => (
                  <div 
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      style === s.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="font-bold text-sm text-gray-900">{s.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-gray-500">Dizayn rasmi (ixtiyoriy)</Label>
              <div className="relative aspect-video rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group hover:border-blue-400 transition-colors">
                {designImage ? (
                  <div className="relative w-full h-full">
                    <img src={designImage} alt="Design" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDesignImage(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs font-medium">O'zingiz xohlagan rasm bo'lsa, yuklang</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, setDesignImage)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width" className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-400" />
                  Eni (metr)
                </Label>
                <Input
                  id="width"
                  type="number"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Masalan: 3.5"
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-400 rotate-90" />
                  Bo'yi (metr)
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Masalan: 2.2"
                  className="rounded-xl h-12"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-gray-500">Materialni tanlang</Label>
              <div className="space-y-2">
                {materials.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setMaterial(m.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      material === m.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900">{m.name}</p>
                      <p className="text-[10px] text-gray-400">{m.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-white text-[10px] uppercase">{m.quality}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-gray-500">Qo'shimcha funksiyalar</Label>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFeature(f.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                      selectedFeatures.includes(f.id) 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <f.icon className="w-4 h-4" />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-gray-500">O'rnatish joyi rasmi</Label>
              <div className="relative aspect-video rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden hover:border-blue-400 transition-colors">
                {siteImage ? (
                  <img src={siteImage} alt="Site" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <MapPin className="w-8 h-8" />
                    <span className="text-xs font-medium">O'rnatish joyini suratga olib yuklang</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, setSiteImage)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">Joylashuv turi</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="rounded-2xl h-12">
                  <SelectValue placeholder="Joyni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Shaxsiy hovli</SelectItem>
                  <SelectItem value="work">Sanoat hududi / Idora</SelectItem>
                  <SelectItem value="other">Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">To'liq manzil</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Viloyat, tuman, ko'cha, uy raqami"
                className="rounded-2xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Qo'shimcha izohlar</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Buyurtma bo'yicha boshqa istaklaringizni yozing..."
                className="rounded-2xl min-h-[100px] p-4"
              />
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold">Yakuniy qadam</h4>
              <p className="text-sm text-gray-500 text-center">Buyurtmani tasdiqlash uchun aloqa ma'lumotlarini kiriting</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ism</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ism"
                  required
                  className="rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Familiya</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Familiya"
                  required
                  className="rounded-2xl h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqami</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                required
                className="rounded-2xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>To'lov usuli (kelishiladi)</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-2xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Naqd pul</SelectItem>
                  <SelectItem value="card">Click / Payme</SelectItem>
                  <SelectItem value="transfer">Bank o'tkazmasi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 mt-1" />
              <p className="text-[10px] text-gray-500">
                Sizning ma'lumotlaringiz xafvsiz. Biz faqat buyurtma tafsilotlarini aniqlashtirish uchun aloqaga chiqamiz.
              </p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-white flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-black text-gray-900 leading-tight">
                {product ? product.name : 'Maxsus Buyurtma'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Step {step} of 4
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {step === 1 && 'Dizayn & Uslub'}
                  {step === 2 && 'O\'lcham & Material'}
                  {step === 3 && 'Manzil & Suratlar'}
                  {step === 4 && 'Aloqa ma\'lumotlari'}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-blue-600' : s < step ? 'w-4 bg-blue-200' : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-8 border-t bg-white flex items-center justify-between gap-4">
            {step > 1 ? (
              <Button 
                variant="ghost" 
                onClick={prevStep}
                className="rounded-2xl px-6 py-6 font-bold text-gray-500 hover:bg-gray-100 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="rounded-2xl px-6 py-6 font-bold text-gray-400 hover:bg-gray-50 flex items-center gap-2"
              >
                Yopish
              </Button>
            )}

            {step < 4 ? (
              <Button 
                onClick={nextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6 font-black text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                Keyingi
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-2xl py-6 font-black text-lg shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Tasdiqlash
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
