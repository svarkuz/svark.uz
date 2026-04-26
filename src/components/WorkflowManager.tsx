import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardList, 
  Plus, 
  Play, 
  Clock, 
  User, 
  Navigation, 
  CheckCircle2, 
  Trash2,
  Calendar,
  Layers,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Workflow {
  id: string;
  name: string;
  direction: string;
  user: string;
  startTime: string;
  status: 'pending' | 'running' | 'completed';
  createdAt: any;
}

export const WorkflowManager: React.FC<{ user: any }> = ({ user }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [direction, setDirection] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [startTime, setStartTime] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'worker';

  const updateWorkflowField = async (id: string, field: string, value: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'workflows', id), {
        [field === 'assignedUser' ? 'user' : field]: value
      });
      toast.success("Muvaffaqiyatli saqlandi (Saved)!");
      setEditingId(null);
      setEditingField(null);
    } catch (error) {
      toast.error("Saqlashda xatolik");
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'workflows'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkflows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workflow)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workflows');
    });
    return () => unsubscribe();
  }, []);

  const handleSaveWorkflow = async () => {
    if (!isAdmin) return;
    if (!name || !direction || !assignedUser || !startTime) {
      toast.error("Iltimos, barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'workflows'), {
        name,
        direction,
        user: assignedUser,
        startTime,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Ish oqimi muvaffaqiyatli saqlandi!");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const startWorkflow = async (id: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'workflows', id), {
        status: 'running'
      });
      toast.success("Ish oqimi boshlandi!");
    } catch (error) {
      toast.error("Boshlashda xatolik");
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'workflows', id));
      toast.success("O'chirildi");
    } catch (error) {
      toast.error("O'chirishda xatolik");
    }
  };

  const resetForm = () => {
    setName('');
    setDirection('');
    setAssignedUser('');
    setStartTime('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <Layers className="w-8 h-8 text-blue-600" />
            Jarayonlar (Process)
          </h2>
          <p className="text-gray-500">Ish oqimlarini boshqarish va kuzatish</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-14 font-bold shadow-xl shadow-blue-100 gap-2">
              <Plus className="w-5 h-5" />
              Ish oqimi qo'shish (Add workflow)
            </Button>
          } />
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-lg">
            <div className="bg-blue-600 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Yangi ish oqimi</DialogTitle>
                <CardDescription className="text-blue-100 font-medium opacity-80">Workflow ma'lumotlarini kiriting</CardDescription>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nomi (Name)</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Workflow nomini kiriting"
                    className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Yo'nalish (Direction)</Label>
                  <Input 
                    value={direction} 
                    onChange={(e) => setDirection(e.target.value)}
                    placeholder="Ish yo'nalishini kiriting"
                    className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Foydalanuvchi (User)</Label>
                  <Input 
                    value={assignedUser} 
                    onChange={(e) => setAssignedUser(e.target.value)}
                    placeholder="Mas'ul foydalanuvchini kiriting"
                    className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Boshlanish vaqti (Start time)</Label>
                  <Input 
                    type="datetime-local"
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-gray-50 gap-3 border-t">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl h-12 px-6">Bekor qilish</Button>
              <Button onClick={handleSaveWorkflow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold">
                {loading ? "Saqlanmoqda..." : "Saqlash (Save)"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {workflows.map((wf) => (
            <motion.div
              key={wf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="rounded-3xl border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                <div className={`h-2 ${wf.status === 'running' ? 'bg-green-500' : wf.status === 'completed' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                <CardHeader className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold">{wf.name}</CardTitle>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 bg-gray-100 text-gray-600 border-none font-bold text-[10px] uppercase tracking-wider">
                        {wf.status === 'running' ? 'Boshlangan' : wf.status === 'completed' ? 'Tugallangan' : 'Kutilmoqda'}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteWorkflow(wf.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="space-y-4">
                    {/* Yo'nalish Section */}
                    <div className="flex items-center justify-between group/field">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yo'nalish (Direction)</p>
                          <p className="font-medium">{wf.direction}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Dialog>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover/field:opacity-100 transition-opacity">
                              <Edit className="w-3 h-3" />
                            </Button>
                          } />
                          <DialogContent className="rounded-3xl p-6 max-w-xs">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-bold tracking-tighter uppercase text-gray-400">Yo'nalishni tahrirlash</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <Label className="text-[10px] font-black uppercase mb-2 block">Yo'nalish (Direction)</Label>
                              <Input defaultValue={wf.direction} id={`dir-${wf.id}`} className="rounded-xl bg-gray-50 border-none h-12" />
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={() => {
                                  const val = (document.getElementById(`dir-${wf.id}`) as HTMLInputElement).value;
                                  updateWorkflowField(wf.id, 'direction', val);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                              >
                                Saqlash (Save)
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {/* Foydalanuvchi Section */}
                    <div className="flex items-center justify-between group/field">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foydalanuvchi (User)</p>
                          <p className="font-medium">{wf.user}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Dialog>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover/field:opacity-100 transition-opacity">
                              <Edit className="w-3 h-3" />
                            </Button>
                          } />
                          <DialogContent className="rounded-3xl p-6 max-w-xs">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-bold tracking-tighter uppercase text-gray-400">Foydalanuvchini tahrirlash</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <Label className="text-[10px] font-black uppercase mb-2 block">Foydalanuvchi (User)</Label>
                              <Input defaultValue={wf.user} id={`user-${wf.id}`} className="rounded-xl bg-gray-50 border-none h-12" />
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={() => {
                                  const val = (document.getElementById(`user-${wf.id}`) as HTMLInputElement).value;
                                  updateWorkflowField(wf.id, 'assignedUser', val);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                              >
                                Saqlash (Save)
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {/* Boshlanish vaqti Section */}
                    <div className="flex items-center justify-between group/field">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Boshlanish vaqti (Start time)</p>
                          <p className="font-medium">{new Date(wf.startTime).toLocaleString('uz-UZ')}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Dialog>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover/field:opacity-100 transition-opacity">
                              <Edit className="w-3 h-3" />
                            </Button>
                          } />
                          <DialogContent className="rounded-3xl p-6 max-w-xs">
                            <DialogHeader>
                              <DialogTitle className="text-sm font-bold tracking-tighter uppercase text-gray-400">Vaqtni tahrirlash</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <Label className="text-[10px] font-black uppercase mb-2 block">Start time</Label>
                              <Input type="datetime-local" defaultValue={wf.startTime} id={`time-${wf.id}`} className="rounded-xl bg-gray-50 border-none h-12" />
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={() => {
                                  const val = (document.getElementById(`time-${wf.id}`) as HTMLInputElement).value;
                                  updateWorkflowField(wf.id, 'startTime', val);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                              >
                                Saqlash (Save)
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {wf.status === 'pending' && isAdmin && (
                    <Dialog>
                      <DialogTrigger render={
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold gap-2 mt-4 shadow-xl shadow-blue-100"
                        >
                          <Play className="w-4 h-4" />
                          Boshlash (Start)
                        </Button>
                      } />
                      <DialogContent className="rounded-[2.5rem] p-8 max-w-sm text-center">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6">
                          <Play className="w-10 h-10 ml-1" />
                        </div>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black mb-2">Ishni boshlaysizmi?</DialogTitle>
                          <CardDescription className="text-gray-500 font-medium">Ushbu ish oqimi "Boshlangan" holatiga o'tkaziladi.</CardDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col gap-3 mt-8">
                          <Button 
                            onClick={() => startWorkflow(wf.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-bold w-full"
                          >
                            Saqlash (Save)
                          </Button>
                          <DialogTrigger render={
                            <Button variant="ghost" className="rounded-2xl h-12 w-full text-gray-400">Bekor qilish</Button>
                          } />
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {wf.status === 'running' && (
                    <div className="w-full bg-green-50 text-green-600 rounded-xl py-4 flex items-center justify-center font-bold gap-2 mt-4 border border-green-100 italic">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Ishlanmoqda...
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {workflows.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-bold">Hozircha ish oqimlari mavjud emas</p>
            <p className="text-sm">Yangi jarayon yaratish uchun yuqoridagi tugmani bosing</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
