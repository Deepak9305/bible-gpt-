import React, { useEffect, useState } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { getStats } from '../services/statsService';

export default function AdBanner() {
  const [isAdShowing, setIsAdShowing] = useState(false);

  useEffect(() => {
    const showAd = async () => {
      // Don't show ads to premium users or on web
      if (getStats().isPremium || !Capacitor.isNativePlatform()) return;

      try {
        const adId = Capacitor.getPlatform() === 'ios' 
          ? 'ca-app-pub-3940256099942544/2934735716' // iOS test banner
          : 'ca-app-pub-3940256099942544/6300978111'; // Android test banner

        const options: BannerAdOptions = {
          adId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: true,
        };

        await AdMob.showBanner(options);
        setIsAdShowing(true);
      } catch (e) {
        console.error("Failed to show AdMob banner", e);
      }
    };

    showAd();

    return () => {
      if (isAdShowing) {
        AdMob.hideBanner().catch(e => console.error(e));
      }
    };
  }, [isAdShowing]);

  // We don't render anything in the DOM, the native plugin overlays the ad
  return null;
}
