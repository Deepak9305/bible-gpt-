import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// Official Ad Unit IDs
const AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    // CRITICAL FIX: You cannot use an iOS Ad Unit ID on Android! 
    // Doing so results in a 100% match rate but 0 impressions.
    // Please replace the test ID below with your actual Android Ad Unit ID from AdMob.
    android: 'ca-app-pub-3940256099942544/6300978111', // Android Test Banner ID
};

class AdService {
    private static instance: AdService;
    private isBannerVisible = false;

    private intendedBannerState = false;

    private constructor() {
        this.initKeyboardListeners();
        // NOTE: AdMob.removeBanner() is NOT called here because AdMob.initialize()
        // hasn't been called yet at singleton construction time.
        // Cleanup is handled by nativeService.ts after initialize().
    }

    private initKeyboardListeners() {
        if (Capacitor.isNativePlatform()) {
            // BUG FIX: Added .catch() — listener attachment is async and can fail silently
            Keyboard.addListener('keyboardWillShow', () => {
                this.hideBannerInternal();
            }).catch(e => console.warn('AdService: keyboardWillShow listener failed', e));
            Keyboard.addListener('keyboardWillHide', () => {
                if (this.intendedBannerState) {
                    this.showBannerInternal();
                }
            }).catch(e => console.warn('AdService: keyboardWillHide listener failed', e));
        }
    }

    public static getInstance(): AdService {
        if (!AdService.instance) {
            AdService.instance = new AdService();
        }
        return AdService.instance;
    }

    public async showBanner() {
        this.intendedBannerState = true;
        await this.showBannerInternal();
    }

    public async hideBanner() {
        this.intendedBannerState = false;
        await this.hideBannerInternal();
    }

    private async showBannerInternal() {
        if (!Capacitor.isNativePlatform()) {
            console.log('AdMob: Banners are only supported on native platforms.');
            return;
        }

        if (this.isBannerVisible) return;

        try {
            const adId = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;

            await AdMob.showBanner({
                adId: adId,
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                // CRITICAL FIX: The banner must not overlap with ANY web view elements 
                // (like the bottom nav) or AdMob will register 0 impressions. 
                // 90px clears the nav bar (64px) + safe-areas on modern devices.
                margin: 90,
                // NOTE: If you are testing on your local device with a live ad unit, 
                // Google will register 100% match rate but 0 impressions to prevent fraud.
                isTesting: false,
            });

            this.isBannerVisible = true;
            console.log('AdMob: Banner shown successfully');
        } catch (error) {
            console.error('AdMob: Failed to show banner', error);
        }
    }

    private async hideBannerInternal() {
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
