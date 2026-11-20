import { useState } from 'react';

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('EN');
  return (
    <span data-language={language} data-set-language={typeof setLanguage}>
      {children}
    </span>
  );
}
