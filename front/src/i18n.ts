import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to the Multilingual App!",
    }
  },
  fr: {
    translation: {
      "welcome": "Bienvenue sur l'Application Multilingue !",
    }
  }
};

i18n
  .use(LanguageDetector) 
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;