import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'uz' | 'ru';

interface Translations {
  [key: string]: {
    uz: string;
    ru: string;
  };
}

const translations: Translations = {
  // Common
  'loading': { uz: 'Yuklanmoqda...', ru: 'Загрузка...' },
  'login': { uz: 'Kirish', ru: 'Вход' },
  'logout': { uz: 'Chiqish', ru: 'Выход' },
  'save': { uz: 'Saqlash', ru: 'Сохранить' },
  'cancel': { uz: 'Bekor qilish', ru: 'Отмена' },
  // Navbar
  'catalog': { uz: 'Katalog', ru: 'Каталог' },
  'gallery': { uz: 'Galereya', ru: 'Галерея' },
  'chat': { uz: 'Chat', ru: 'Чат' },
  'messages': { uz: 'Xabarlar', ru: 'Сообщения' },
  'orders': { uz: 'Buyurtmalar', ru: 'Заказы' },
  'profile': { uz: 'Profil', ru: 'Профиль' },
  'panel': { uz: 'Panel', ru: 'Панель' },
  'cart': { uz: 'Savat', ru: 'Корзина' },
  // AI
  'ai_advisor': { uz: 'AI Yordamchi', ru: 'AI Помощник' },
  'get_ai_help': { uz: 'AI yordamida dizayn tanlang', ru: 'Выберите дизайн с помощью AI' },
  // Login Modal
  'welcome': { uz: 'Xush kelibsiz!', ru: 'Добро пожаловать!' },
  'premium_services': { uz: 'Premium xizmatlardan foydalaning', ru: 'Пользуйтесь премиум услугами' },
  'customer': { uz: 'Mijoz', ru: 'Клиент' },
  'worker': { uz: 'Usta', ru: 'Мастер' },
  'enter_name': { uz: 'ISMNI KIRITING', ru: 'ВВЕДИТЕ ИМЯ' },
  'enter_phone': { uz: 'Telefon raqamingiz', ru: 'Ваш номер телефона' },
  'login_btn': { uz: 'KIRISH', ru: 'ВОЙТИ' },
  'or_premium': { uz: 'Yoki Premium Kirish', ru: 'Или Премиум Вход' },
  'google_login': { uz: 'Google orqali', ru: 'Через Google' },
  'master_login': { uz: 'USTA SIFATIDA', ru: 'КАК МАСТЕР' },
  'secret_pass': { uz: 'Maxfiy Parol', ru: 'Секретный пароль' },
  // Settings
  'settings': { uz: 'Sozlamalar', ru: 'Настройки' },
  'theme': { uz: 'Mavzu', ru: 'Тема' },
  'dark_mode': { uz: 'Qorong\'u rejim', ru: 'Темный режим' },
  'light_mode': { uz: 'Yoriq rejim', ru: 'Светлый режим' },
  'language': { uz: 'Til', ru: 'Язык' },
  'russian': { uz: 'Rus tili', ru: 'Русский язык' },
  'uzbek': { uz: 'O\'zbek tili', ru: 'Узбекский язык' },
  // Master Dashboard
  'edit_section': { uz: 'Tahrirlash', ru: 'Редактирование' },
  'add_process': { uz: 'Ish jarayoni qo\'shish', ru: 'Добавить рабочий процесс' },
  'edit_about': { uz: 'Biz haqimizda o\'zgartirish', ru: 'Изменить о нас' },
  'about_us': { uz: 'Biz haqimizda', ru: 'О нас' },
  'orders_all': { uz: 'Buyurtmalar', ru: 'Заказы' },
  'add_worker': { uz: 'Ishchi qo\'shish', ru: 'Добавить работника' },
  'virtual_test': { uz: 'Virtual Sinov', ru: 'Виртуальный тест' },
  'ai_chat_full': { uz: 'AI Chat (To\'liq)', ru: 'AI Чат (Полный)' },
  'no_reviews': { uz: 'Hozircha sharhlar yo\'q', ru: 'Отзывов пока нет' },
  'my_reviews': { uz: 'Sharhlarim', ru: 'Мои отзывы' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'uz');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
