import React, { useEffect } from 'react';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';

interface BannerAdProps {
  shouldShow?: boolean;
  onLoaded?: () => void;
}

export const BannerAd: React.FC<BannerAdProps> = ({ shouldShow = true, onLoaded }) => {
  // Notify parent the moment an ad actually renders so it can add padding
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: any;
    AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      onLoaded?.();
    }).then(h => { handle = h; });

    return () => { handle?.remove(); };
  }, [onLoaded]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (shouldShow) {
      adService.showBanner();
    } else {
      adService.hideBanner();
    }

    return () => { adService.hideBanner(); };
  }, [shouldShow]);

  return null;
};

export default BannerAd;
