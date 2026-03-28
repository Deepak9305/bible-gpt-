import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// Official Ad Unit IDs
const AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    android: 'ca-app-pub-7381421031784616/6798345893',
};

class AdService {
    private static instance: AdService;
    private isBannerVisible = false;

    private constructor() {
        this.initKeyboardListeners();
    }

    private initKeyboardListeners() {
        if (Capacitor.isNativePlatform()) {
            Keyboard.addListener('keyboardWillShow', () => {
                this.hideBanner();
            });
            Keyboard.addListener('keyboardWillHide', () => {
                // We show it again if it was supposed to be visible
                // But only if we are still on a screen that wants it
                // For now, let's just show it again
                this.showBanner();
            });
        }
    }

    public static getInstance(): AdService {
        if (!AdService.instance) {
            AdService.instance = new AdService();
        }
        return AdService.instance;
    }

    public async showBanner() {
        if (!Capacitor.isNativePlatform()) {
            console.log('AdMob: Banners are only supported on native platforms.');
            return;
        }

        if (this.isBannerVisible) return;

        try {
            const adId = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;

            await AdMob.showBanner({
                adId: adId,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 100, // Balanced padding to clear navigation bar + safe area on most devices
                isTesting: false,
            });

            this.isBannerVisible = true;
            console.log('AdMob: Banner shown successfully');
        } catch (error) {
            console.error('AdMob: Failed to show banner', error);
        }
    }

    public async hideBanner() {
        if (!Capacitor.isNativePlatform() || !this.isBannerVisible) return;

        try {
            await AdMob.hideBanner();
            this.isBannerVisible = false;
            console.log('AdMob: Banner hidden');
        } catch (error) {
            console.error('AdMob: Failed to hide banner', error);
        }
    }

    public async removeBanner() {
        if (!Capacitor.isNativePlatform()) return;

        try {
            await AdMob.removeBanner();
            this.isBannerVisible = false;
            console.log('AdMob: Banner removed');
        } catch (error) {
            console.error('AdMob: Failed to remove banner', error);
        }
    }
}

export const adService = AdService.getInstance();
