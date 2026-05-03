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
        userId: user.uid,
        userName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone: phone,
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
                      style === s.id ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="font-bold text-sm text-gray-900 italic tracking-tight">{s.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 italic text-gray-500">Dizayn rasmi (ixtiyoriy)</Label>
              <div className="relative aspect-video rounded-3xl bg-gray-50 border-2 border-dashed border-gold/10 overflow-hidden group hover:border-gold/30 transition-colors">
                {designImage ? (
                  <div className="relative w-full h-full">
                    <img src={designImage} alt="Design" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDesignImage(null); }}
                      className="absolute top-4 right-4 bg-red-500 text-white rounded-xl p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gold/30 gap-3">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">O'zingiz xohlagan rasm bo'lsa, yuklang</span>
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
                <Label htmlFor="width" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">
                  <Ruler className="w-3.5 h-3.5 text-gold/40" />
                  Eni (metr)
                </Label>
                <Input
                  id="width"
                  type="number"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="3.5"
                  className="rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">
                  <Ruler className="w-3.5 h-3.5 text-gold/40 rotate-90" />
                  Bo'yi (metr)
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="2.2"
                  className="rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 italic text-gray-500">Materialni tanlang</Label>
              <div className="space-y-3">
                {materials.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setMaterial(m.id)}
                    className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group h-20 ${
                      material === m.id ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className={`font-black uppercase italic tracking-tighter text-base transition-colors ${material === m.id ? 'text-gold' : 'text-gray-900 group-hover:text-gold'}`}>{m.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{m.description}</p>
                    </div>
                    <Badge variant="outline" className={`border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest italic ${material === m.id ? 'bg-gold text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{m.quality}</Badge>
                  </div>
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
              <div className="relative aspect-video rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gold/10 overflow-hidden hover:border-gold/30 transition-colors group">
                {siteImage ? (
                  <img src={siteImage} alt="Site" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gold/30 gap-3">
                    <MapPin className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic tracking-tight">O'rnatish joyini suratga olib yuklang</span>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Joylashuv turi</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="rounded-2xl h-14 bg-gray-50 border-none focus:ring-gold/20 font-bold italic uppercase text-xs">
                  <SelectValue placeholder="Joyni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gold/10">
                  <SelectItem value="home">SHAXSIY HOVLI</SelectItem>
                  <SelectItem value="work">SANOAT HUDUDI / IDORA</SelectItem>
                  <SelectItem value="other">BOSHQA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">To'liq manzil</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Viloyat, tuman, ko'cha, uy raqami"
                className="rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Qo'shimcha izohlar</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Buyurtma bo'yicha boshqa istaklaringizni yozing..."
                className="rounded-[1.5rem] min-h-[120px] p-6 bg-gray-50 border-none focus-visible:ring-gold/20 font-medium italic"
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
            className="space-y-8"
          >
            <div className="flex flex-col items-center justify-center py-6 gap-3 bg-gold/5 rounded-[2.5rem] border border-gold/10">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-gold transform rotate-12">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">YAKUNIY QADAM</h4>
                <p className="text-[10px] font-black uppercase text-gold tracking-widest mt-1">Siz bilan bog'lanishimiz uchun</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Ism</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ism"
                  required
                  className="rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Familiya</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Familiya"
                  required
                  className="rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">Telefon raqami</Label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/40" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998"
                  required
                  className="pl-12 rounded-2xl h-14 bg-gray-50 border-none focus-visible:ring-gold/20 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 italic">To'lov usuli (kelishiladi)</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-2xl h-14 bg-gray-50 border-none focus:ring-gold/20 font-black italic uppercase text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gold/10">
                  <SelectItem value="cash">NAQD PUL</SelectItem>
                  <SelectItem value="card">CLICK / PAYME</SelectItem>
                  <SelectItem value="transfer">BANK O'TKAZMASI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-6 bg-gold/5 rounded-[2rem] border border-gold/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-green-500 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-relaxed tracking-widest italic">
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
      <DialogContent className="sm:max-w-[550px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-10 border-b border-gold/5 bg-gray-50/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black text-gray-900 leading-tight uppercase italic tracking-tighter">
                {product ? product.name : 'Maxsus Buyurtma'}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-gold px-4 py-1.5 rounded-full shadow-lg shadow-gold/20 italic">
                  Step {step} of 4
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                  {step === 1 && 'Dizayn & Uslub'}
                  {step === 2 && 'O\'lcham & Material'}
                  {step === 3 && 'Manzil & Suratlar'}
                  {step === 4 && 'Aloqa ma\'lumotlari'}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 relative z-10">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    s === step ? 'w-10 bg-gold shadow-lg shadow-gold/30' : s < step ? 'w-5 bg-gold/30' : 'w-3 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-10 border-t border-gold/5 bg-white flex items-center justify-between gap-6">
            {step > 1 ? (
              <Button 
                variant="ghost" 
                onClick={prevStep}
                className="rounded-[1.5rem] h-16 px-8 font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gold flex items-center gap-3 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Orqaga
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="rounded-[1.5rem] h-16 px-8 font-black uppercase text-[10px] tracking-widest text-gray-300 hover:bg-gray-50 flex items-center gap-3 transition-all"
              >
                Yopish
              </Button>
            )}

            {step < 4 ? (
              <Button 
                onClick={nextStep}
                className="flex-1 bg-gold hover:bg-gold-light text-white rounded-[1.5rem] h-16 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-gold/30 flex items-center justify-center gap-3 transform active:scale-95 transition-all"
              >
                Keyingi
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] h-16 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 transform active:scale-95 transition-all"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Tasdiqlash
                    <CheckCircle2 className="w-6 h-6" />
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
