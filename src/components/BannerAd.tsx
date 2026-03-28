import React, { useEffect } from 'react';
import { adService } from '../services/adService';
import { Capacitor } from '@capacitor/core';

export const BannerAd: React.FC = () => {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            adService.showBanner();
        }

        return () => {
            // We don't necessarily want to hide it immediately on unmount 
            // if it's meant to be global, but for policy reasons, 
            // we might want to hide it if we leave the screen area.
            // However, usually AdMob banners in Capacitor persist.
        };
    }, []);

    return null; // The banner is handled by the native plugin, not by React DOM
};

export default BannerAd;
