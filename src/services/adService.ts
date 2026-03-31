import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// Official Ad Unit IDs
const AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    // BUG FIX: iOS and Android must have separate Ad Unit IDs from AdMob console
    android: 'ca-app-pub-7381421031784616/6798345893',
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
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                // BUG FIX: 100px margin was too large on small phones, overlapping content.
                // 56px clears the bottom nav bar (h-16 = 64px) minus safe-area handling.
                margin: 56,
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
