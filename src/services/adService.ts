import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

const AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    android: 'ca-app-pub-7381421031784616/6798345893',
};

class AdService {
    private static instance: AdService;

    // Whether the native banner view has been created (survives hide/resume cycles)
    private bannerCreated = false;
    // Whether the banner is currently visible on screen
    private isBannerVisible = false;
    // The last intended state — used to restore after keyboard dismiss
    private intendedBannerState = false;

    private constructor() {
        this.initKeyboardListeners();
    }

    private initKeyboardListeners() {
        if (Capacitor.isNativePlatform()) {
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
        if (!Capacitor.isNativePlatform()) return;
        if (this.isBannerVisible) return;

        try {
            if (!this.bannerCreated) {
                // First time — create and show the banner
                const adId = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;
                await AdMob.showBanner({
                    adId,
                    adSize: BannerAdSize.BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 90,
                    isTesting: false,
                });
                this.bannerCreated = true;
            } else {
                // Banner already exists — resume it (avoids duplicate native views)
                await AdMob.resumeBanner();
            }
            this.isBannerVisible = true;
        } catch (error) {
            console.error('AdMob: Failed to show banner', error);
        }
    }

    private async hideBannerInternal() {
        if (!Capacitor.isNativePlatform() || !this.isBannerVisible) return;

        try {
            await AdMob.hideBanner();
            this.isBannerVisible = false;
        } catch (error) {
            console.error('AdMob: Failed to hide banner', error);
        }
    }

    public async removeBanner() {
        if (!Capacitor.isNativePlatform()) return;

        try {
            await AdMob.removeBanner();
            this.isBannerVisible = false;
            this.bannerCreated = false;
        } catch (error) {
            console.error('AdMob: Failed to remove banner', error);
        }
    }
}

export const adService = AdService.getInstance();
