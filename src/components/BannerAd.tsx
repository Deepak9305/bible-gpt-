import React, { useEffect } from 'react';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';

export const BannerAd: React.FC<{ shouldShow?: boolean }> = ({ shouldShow = true }) => {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            if (shouldShow) {
                adService.showBanner();
            } else {
                adService.hideBanner();
            }
        }
    }, [shouldShow]);

    return null; // The banner is handled by the native plugin, not by React DOM
};

export default BannerAd;
