import React, { useEffect } from 'react';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';

export const BannerAd: React.FC<{ shouldShow?: boolean }> = ({ shouldShow = true }) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (shouldShow) {
      adService.showBanner();
    } else {
      adService.hideBanner();
    }
  }, [shouldShow]);

  useEffect(() => {
    return () => { adService.hideBanner(); };
  }, []);

  return null;
};

export default BannerAd;
