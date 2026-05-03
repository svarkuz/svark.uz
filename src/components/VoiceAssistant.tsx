import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, X, Sparkles, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
  onSearch?: (query: string) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ activeTab, setActiveTab, onSearch }) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [shouldBeListening, setShouldBeListening] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [history, setHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const aiRef = useRef<any>(null);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'uz-UZ';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        processVoiceCommand(transcriptText);
      };

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setShouldBeListening(false);
          setHasPermissionError(true);
          toast.error("Mikrofonga ruxsat berilmadi. Iltimos, brauzer manzili yonidagi qulf belgisini bosib mikrofonga ruxsat bering.", {
            duration: 5000,
          });
        } else if (event.error === 'network') {
          toast.error("Internet aloqasida xatolik");
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors to avoid annoying toasts, 
          // but we might want to restart if shouldBeListening is true
          if (shouldBeListening) {
            setTimeout(() => {
              try {
                if (shouldBeListening && isVoiceMode) recognition.start();
              } catch (e) {}
            }, 100);
          }
        }
      };
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    const handleOpenAi = () => {
      setIsVoiceMode(true);
      setIsMinimized(false);
      setHasPermissionError(false);
      
      // Prime the recognition within the user gesture
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          // We'll stop it immediately if we want to wait for the greeting, 
          // but starting it here satisfies the browser's gesture requirement.
          setShouldBeListening(true);
        } catch (e) {
          console.error("Initial start error:", e);
        }
      } else {
        setShouldBeListening(true);
      }
    };
    window.addEventListener('open-ai-assistant', handleOpenAi);
    return () => window.removeEventListener('open-ai-assistant', handleOpenAi);
  }, [initRecognition]);

  useEffect(() => {
    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    aiRef.current = ai;
    initRecognition();
  }, [initRecognition]);

  useEffect(() => {
    if (isVoiceMode) {
      const welcomeMsg = "Assalomu alaykum, xush kelibsiz ilovamizga! Biz shu ilovamizda siz darvoza, reshotka va boshqa narsalarga buyurtma berishingiz mumkin. Buyurtma berish mutlaqo bepul.";
      setResponse(welcomeMsg);
    } else {
      setShouldBeListening(false);
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    }
  }, [isVoiceMode]);

  useEffect(() => {
    if (shouldBeListening && !isListening && isVoiceMode) {
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    }
  }, [shouldBeListening, isListening, isVoiceMode]);

  const processVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setResponse('');

    try {
      const result = await aiRef.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text }] }
        ],
        config: {
          systemInstruction: `Siz "svark_uz" ilovasining aqlli ovozli yordamchisisiz. 
            Foydalanuvchi ilovani ovoz orqali to'liq boshqarishi mumkin. 
            Sizning vazifangiz foydalanuvchi xohishini tushunish va tegishli funksiyani chaqirish.
            
            Kompaniya haqida ma'lumot:
            - Nomi: "svark_uz" (yoki Svark tizimi).
            - Sifati: Bu juda ham sifatli va hamyonbop bo'lgan tizim.
            - Tajriba: Ustalarimiz 8 yildan ko'p tajribaga ega.
            - Maqsad: Darvoza, reshotka va boshqa temir buyumlar yasash.
            
            Sizda quyidagi funksiyalar bor:
            1. switchTab(tab): Bo'limlarni almashtirish. 
               - 'catalog': Mahsulotlar katalogi va buyurtma berish bo'limi.
               - 'gallery': Ish jarayonlari va tayyor ishlar galereyasi.
               - 'craftsmen': Ustalarimiz va ularning ish namunalari.
               - 'chat': Admin va ustalar bilan muloqot chati.
               - 'svark-ai': AI dizayn va kamera bo'limi.
               - 'notifications': Bildirishnomalar bo'limi.
               - 'my-orders': Foydalanuvchining shaxsiy buyurtmalari.
            2. searchProduct(query): Katalogda mahsulotlarni qidirish.
            3. openCamera(): SvarkAI bo'limida kamerani ishga tushirish.
            4. sendChatMessage(text): Agar foydalanuvchi chat bo'limida bo'lsa, xabar yuborish.
            
            Muloqot qoidalari:
            - Foydalanuvchi bilan har doim o'zbek tilida, samimiy va professional muloqot qiling.
            - Savollarga javob bering, lekin javobdan so'ng albatta foydalanuvchi bilan muloqotni davom ettirish uchun savol bering.
            - Suhbatni siz boshqaring va foydalanuvchini qiziqtiring.
            - Agar foydalanuvchi "Katalogga o't", "Mahsulotlarni ko'rsat" desa, switchTab('catalog') ni chaqiring.
            - Agar foydalanuvchi "Chatni och", "Suhbatni och" desa, switchTab('chat') ni chaqiring.
            - Agar foydalanuvchi "Assalomu alaykum" deb yozmoqchi bo'lsa yoki chatda xabar qoldirmoqchi bo'lsa, sendChatMessage funksiyasini ishlating.
            - Siz minimallashtirilgan holatda ham (minus tugmasi bosilganda) ishlashda davom etasiz.
            - Foydalanuvchi sizni yopmaguncha (X tugmasi) siz doim yordamga tayyorsiz.
            
            Foydalanuvchi buyrug'ini bajarganingizdan so'ng, nima qilganingizni ovozli tasdiqlang va keyingi qadamni so'rang.`,
          tools: [{
            functionDeclarations: [
              {
                name: "switchTab",
                description: "Switch to a specific tab in the application.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tab: {
                      type: Type.STRING,
                      enum: ["catalog", "gallery", "craftsmen", "chat", "svark-ai", "notifications", "my-orders"],
                      description: "The name of the tab to switch to."
                    }
                  },
                  required: ["tab"]
                }
              },
              {
                name: "searchProduct",
                description: "Search for a product in the catalog.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "The search query."
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "openCamera",
                description: "Open the camera in SvarkAI section."
              },
              {
                name: "sendChatMessage",
                description: "Send a message in the chat section.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    text: {
                      type: Type.STRING,
                      description: "The message text to send."
                    }
                  },
                  required: ["text"]
                }
              }
            ]
          }]
        }
      });

      const functionCalls = result.functionCalls;
      const textResponse = result.text;

      // Update history
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: textResponse || 'Function call executed' }] }
      ]);

      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === 'switchTab') {
            setActiveTab(call.args.tab as string);
            const msg = `Xo'p bo'ladi, ${call.args.tab} bo'limiga o'tamiz.`;
            setResponse(msg);
          } else if (call.name === 'searchProduct') {
            onSearch?.(call.args.query as string);
            setActiveTab('catalog');
            const msg = `"${call.args.query}" bo'yicha mahsulotlarni qidiryapman.`;
            setResponse(msg);
          } else if (call.name === 'openCamera') {
            setActiveTab('svark-ai');
            const msg = "Kamerani ochyapman. Tayyor bo'ling.";
            setResponse(msg);
          } else if (call.name === 'sendChatMessage') {
            setActiveTab('chat');
            // We need a way to trigger message sending in AdminChat
            // For now, we'll just confirm and the user can see it's open
            const msg = `Chatga "${call.args.text}" deb yozishga tayyorman.`;
            setResponse(msg);
            // Dispatch a custom event that AdminChat can listen to
            window.dispatchEvent(new CustomEvent('ai-send-message', { detail: { text: call.args.text } }));
          }
        }
      } else {
        setResponse(textResponse || '');
      }
    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    setHasPermissionError(false);
    if (isListening) {
      setShouldBeListening(false);
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setResponse('');
      window.speechSynthesis.cancel();
      setShouldBeListening(true);
      try {
        if (!recognitionRef.current) initRecognition();
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Recognition start error:", err);
        initRecognition();
        recognitionRef.current?.start();
      }
    }
  };

  if (!isVoiceMode) {
    return (
      <Button 
        onClick={() => setIsVoiceMode(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gold hover:bg-gold-light shadow-2xl z-50 p-0 flex items-center justify-center group border-4 border-white"
      >
        <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <motion.div 
        layoutId="assistant-window"
        className="fixed bottom-24 right-6 flex flex-col items-center gap-2 z-50 transition-all"
      >
        <Button 
          onClick={() => setIsMinimized(false)}
          className={`w-16 h-16 rounded-full shadow-2xl border-4 border-white ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gold'}`}
        >
          {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-24 right-6 left-6 sm:left-auto sm:w-96 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gold/10"
      >
        <div className="p-4 bg-gold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs italic">Ovozli boshqaruv</span>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:bg-white/20 rounded-full"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsVoiceMode(false)}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {!isSupported ? (
              <div className="text-center space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <MicOff className="w-10 h-10 text-orange-500 mx-auto" />
                <p className="text-sm text-orange-600 font-medium">
                  Sizning brauzeringiz ovozli boshqaruvni qo'llab-quvvatlamaydi. Iltimos, Google Chrome brauzeridan foydalaning.
                </p>
              </div>
            ) : hasPermissionError ? (
              <div className="text-center space-y-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                <MicOff className="w-10 h-10 text-red-500 mx-auto" />
                <p className="text-sm text-red-600 font-medium">
                  Mikrofonga ruxsat berilmagan. Iltimos, brauzerda ruxsat bering.
                </p>
                <Button 
                  onClick={toggleListening}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                >
                  Qayta urinish
                </Button>
              </div>
            ) : (
              <div className="relative">
                <AnimatePresence>
                  {isListening && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0.2 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-gold rounded-full"
                    />
                  )}
                </AnimatePresence>
                <Button 
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={`w-20 h-20 rounded-full shadow-xl relative z-10 ${
                    isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-gold hover:bg-gold-light'
                  }`}
                >
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </div>
            )}
            {!hasPermissionError && (
              <p className="text-sm font-medium text-gray-500">
                {isListening ? "Sizni eshityapman..." : isProcessing ? "O'ylayapman..." : "Gapirish uchun bosing"}
              </p>
            )}
          </div>

          {(transcript || response) && (
            <div className="space-y-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {transcript && (
                <div className="flex justify-end">
                  <div className="bg-gold/10 text-gold-900 px-4 py-2 rounded-2xl rounded-tr-none text-sm font-medium italic border border-gold/5">
                    {transcript}
                  </div>
                </div>
              )}
              {response && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-tl-none text-sm">
                    {response}
                  </div>
                </div>
              )}
            </div>
          )}

          {!transcript && !response && (
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400">Masalan shunday deng:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Katalogga o't", "Darvozalarni ko'rsat", "Kamerani och"].map((hint, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setTranscript(hint);
                      processVoiceCommand(hint);
                    }}
                    className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-100 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
