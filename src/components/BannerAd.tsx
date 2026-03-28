import React, { useEffect } from 'react';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';

export const BannerAd: React.FC<{ shouldShow?: boolean }> = ({ shouldShow = true }) => {
    const isFirstMount = React.useRef(true);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            if (shouldShow) {
                if (isFirstMount.current) {
                    // Delay the first ever show to ensure splash screen and transitions are fully done
                    const timer = setTimeout(() => {
                        adService.showBanner();
                        isFirstMount.current = false;
                    }, 1500);
                    return () => clearTimeout(timer);
                } else {
                    adService.showBanner();
                }
            } else {
                adService.hideBanner();
            }
        }
    }, [shouldShow]);

    return null; // The banner is handled by the native plugin, not by React DOM
};

export default BannerAd;
