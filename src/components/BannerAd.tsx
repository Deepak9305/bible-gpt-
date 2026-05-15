import React, { useEffect } from 'react';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';
import type { AdMobBannerSize } from '@capacitor-community/admob';

interface BannerAdProps {
  shouldShow?: boolean;
  onSizeChange?: (size: AdMobBannerSize) => void;
}

export const BannerAd: React.FC<BannerAdProps> = ({ shouldShow = true, onSizeChange }) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !onSizeChange) return;

    return adService.onBannerSizeChange(onSizeChange);
  }, [onSizeChange]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (shouldShow) {
      void adService.showBanner();
    } else {
      void adService.hideBanner();
    }
  }, [shouldShow]);

  useEffect(() => {
    return () => { void adService.hideBanner(); };
  }, []);

  return null;
};

export default BannerAd;
