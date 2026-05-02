import { useState } from 'react';

const STORAGE_KEY = 'tailor_shop_id';

export const useShopIdentity = () => {
  const [shopName, setShopNameState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || ''
  );

  const saveShopName = (name: string) => {
    const trimmed = name.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setShopNameState(trimmed);
  };

  const isSetup = shopName.length > 0;

  return { shopName, saveShopName, isSetup };
};
