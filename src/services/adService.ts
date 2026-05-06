import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    android: 'ca-app-pub-7381421031784616/6798345893',
};

class AdService {
    private static instance: AdService;
    private isBannerVisible = false;
    private intendedBannerState = false;

    private constructor() {}

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
            const adId = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;
            await AdMob.showBanner({
                adId,
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 70,
                isTesting: false,
            });
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
        } catch (error) {
            console.error('AdMob: Failed to remove banner', error);
        }
    }
}

export const adService = AdService.getInstance();
