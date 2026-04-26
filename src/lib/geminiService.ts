import { GoogleGenAI } from "@google/genai";

let ai: any = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateImageDescription(imageUrl: string) {
  try {
    const client = getAI();
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Siz svark_uz kompaniyasining AI yordamchisiz. 
          Ushbu rasmda ko'rsatilgan temir darvoza yoki reshotka haqida qisqacha, professional va qiziqarli tavsif yozing. 
          Rasm URL: ${imageUrl}
          Tavsif o'zbek tilida bo'lsin. Dizayn, mustahkamlik va uslubga e'tibor bering.`
        }
      ]
    });
    return response.text || "Ushbu mahsulot svark_uz ustalari tomonidan yuqori sifatli temirdan tayyorlangan. Mustahkam va chiroyli dizayn.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ushbu mahsulot svark_uz ustalari tomonidan yuqori sifatli temirdan tayyorlangan. Mustahkam va chiroyli dizayn.";
  }
}

export async function analyzeDesignFit(productName: string, productDescription: string) {
  try {
    const client = getAI();
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Siz svark_uz kompaniyasining professional dizayner-maslahatchisisiz. 
          Foydalanuvchi "${productName}" nomli mahsulotni (${productDescription}) o'z uyiga o'rnatmoqchi va uni visualizer orqali ko'rmoqda. 
          Ushbu dizayn qanday muhitga mos tushishi, uning afzalliklari va o'rnatish bo'yicha qisqacha (2-3 gap) professional maslahat bering. 
          Maslahat o'zbek tilida, samimiy va ishonchli bo'lsin.`
        }
      ]
    });
    return response.text || "Ushbu dizayn zamonaviy uylar uchun juda mos tushadi. Uning mustahkamligi va nafis ko'rinishi uyingiz ko'rkiga ko'rk qo'shadi.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Ushbu dizayn zamonaviy uylar uchun juda mos tushadi. Uning mustahkamligi va nafis ko'rinishi uyingiz ko'rkiga ko'rk qo'shadi.";
  }
}

export async function getChatResponse(userMessage: string, imageBase64?: string, mimeType?: string) {
  try {
    const client = getAI();
    const parts: any[] = [
      {
        text: `Siz svark_uz kompaniyasining AI yordamchisiz. 
        Kompaniyamiz darvozalar, reshotkalar, santexnika va boshqa temir buyumlar yasash bilan shug'ullanadi.
        Foydalanuvchi savoli: "${userMessage}"
        Foydalanuvchi qaysi tilda gapirsa (O'zbek yoki Rus), o'sha tilda professional, juda qisqa va aniq (maximum 2-3 ta gap) javob bering.
        Siz har qanday savolga javob bera olasiz, lekin asosiy e'tiboringiz bizning xizmatlarimizga qaratilgan bo'lsin.
        Agar foydalanuvchi rasm yaratishni so'rasa, siz rasm yarata olishingizni qisqacha tasdiqlang.
        MUHIM: Narxlar haqida hech qachon aniq raqam aytmang! Narxni faqat usta hisoblab berishini va buning uchun usta bilan bog'lanish yoki o'lchamlarni yuborish kerakligini ayting.
        Javoblaringiz juda qisqa va lo'nda bo'lishi shart.`
      }
    ];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      });
      
      if (mimeType === 'application/pdf') {
        parts[0].text += "\n\nFoydalanuvchi PDF hujjat yukladi. Iltimos, ushbu hujjatdagi dizayn chizmalari yoki ma'lumotlarni tahlil qiling.";
      } else if (mimeType.startsWith('video/')) {
        parts[0].text += "\n\nFoydalanuvchi video xabar yubordi. Iltimos, videoda nimalar borligini tushunib javob bering.";
      }
    }

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }]
    });

    return response.text || "Kechirasiz, hozirda javob bera olmayman.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Kechirasiz, hozirda javob bera olmayman. Iltimos, birozdan so'ng qayta urinib ko'ring yoki ustalarimiz bilan bog'laning.";
  }
}

export async function generateAIImage(prompt: string, backgroundImage?: string, productWeight?: string) {
  try {
    const client = getAI();
    const parts: any[] = [];

    if (backgroundImage) {
      parts.push({
        inlineData: {
          data: backgroundImage.split(',')[1],
          mimeType: "image/jpeg"
        }
      });
    }

    if (productWeight) {
      parts.push({
        inlineData: {
          data: productWeight.split(',')[1],
          mimeType: "image/jpeg"
        }
      });
    }

    parts.push({
      text: `Siz professional dizayner-ustasiz. Berilgan prompt asosida yangi dizayn yaratib bering. 
      Agar rasmlar berilgan bo'lsan, mahsulotni orqa fonga juda chiroyli, realistik va mos tushadigan qilib joylashtiring.
      Prompt: ${prompt}`
    });

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return null;
  }
}
