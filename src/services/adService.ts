import {
    AdMob,
    AdmobConsentStatus,
    BannerAdPluginEvents,
    BannerAdPosition,
    BannerAdSize,
    type AdMobBannerSize,
    type AdMobError,
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const DEFAULT_BANNER_AD_UNITS = {
    ios: 'ca-app-pub-7381421031784616/6798345893',
    android: 'ca-app-pub-7381421031784616/6798345893',
};

const AD_UNITS = {
    ios: import.meta.env.VITE_ADMOB_IOS_BANNER_ID || DEFAULT_BANNER_AD_UNITS.ios,
    android: import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID || DEFAULT_BANNER_AD_UNITS.android,
};

export const COMPACT_BANNER_HEIGHT = 50;
export const BANNER_BOTTOM_MARGIN = 64;

const LOAD_TIMEOUT_MS = 20_000;
const INITIAL_RETRY_DELAY_MS = 15_000;
const MAX_RETRY_DELAY_MS = 120_000;
const SHOULD_USE_TEST_ADS =
    import.meta.env.DEV || import.meta.env.VITE_ADMOB_TEST_ADS === 'true';

type BannerSizeListener = (size: AdMobBannerSize) => void;

class AdService {
    private static instance: AdService;
    private initializePromise?: Promise<void>;
    private listenersPromise?: Promise<void>;
    private shouldShowBanner = false;
    private hasBannerView = false;
    private isBannerLoading = false;
    private isBannerVisible = false;
    private retryAttempt = 0;
    private retryTimeout?: ReturnType<typeof setTimeout>;
    private loadTimeout?: ReturnType<typeof setTimeout>;
    private lastBannerSize: AdMobBannerSize = { width: 0, height: 0 };
    private bannerSizeListeners = new Set<BannerSizeListener>();

    private constructor() {}

    public static getInstance(): AdService {
        if (!AdService.instance) {
            AdService.instance = new AdService();
        }
        return AdService.instance;
    }

    public async initialize() {
        if (!Capacitor.isNativePlatform()) return;

        if (!this.initializePromise) {
            this.initializePromise = this.initializeInternal().catch((error) => {
                this.initializePromise = undefined;
                console.error('AdMob: Failed to initialize', error);
                throw error;
            });
        }

        await this.initializePromise;
    }

    public onBannerSizeChange(listener: BannerSizeListener) {
        this.bannerSizeListeners.add(listener);
        listener(this.lastBannerSize);

        return () => {
            this.bannerSizeListeners.delete(listener);
        };
    }

    public async showBanner() {
        this.shouldShowBanner = true;

        try {
            await this.showBannerInternal();
        } catch (error) {
            console.error('AdMob: Failed to request banner', error);
            if (this.shouldShowBanner) {
                this.scheduleRetry();
            }
        }
    }

    public async hideBanner() {
        this.shouldShowBanner = false;
        this.clearRetry();
        this.clearLoadTimeout();
        await this.hideBannerInternal();
    }

    public async removeBanner() {
        if (!Capacitor.isNativePlatform()) return;

        this.shouldShowBanner = false;
        this.clearRetry();
        this.clearLoadTimeout();

        try {
            await AdMob.removeBanner();
            this.resetBannerState();
        } catch (error) {
            console.error('AdMob: Failed to remove banner', error);
            this.resetBannerState();
        }
    }

    private async initializeInternal() {
        await this.setupListeners();
        await AdMob.initialize();
        await this.updateConsentIfNeeded();
        await AdMob.removeBanner().catch(() => {});
        this.resetBannerState();
    }

    private async setupListeners() {
        if (this.listenersPromise) return this.listenersPromise;

        this.listenersPromise = Promise.all([
            AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
                this.clearLoadTimeout();
                this.isBannerLoading = false;
                this.hasBannerView = true;
                this.isBannerVisible = this.shouldShowBanner;
                this.retryAttempt = 0;
            }),
            AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
                this.notifyBannerSize(size);
            }),
            AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
                this.handleBannerLoadFailure(error);
            }),
            AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
                this.retryAttempt = 0;
            }),
        ])
            .then(() => undefined)
            .catch((error) => {
                this.listenersPromise = undefined;
                throw error;
            });

        return this.listenersPromise;
    }

    private async updateConsentIfNeeded() {
        try {
            const consentInfo = await AdMob.requestConsentInfo();

            if (
                consentInfo.isConsentFormAvailable &&
                consentInfo.status === AdmobConsentStatus.REQUIRED
            ) {
                await AdMob.showConsentForm();
            }
        } catch (error) {
            console.warn('AdMob: Consent check failed; continuing with SDK defaults', error);
        }
    }

    private async showBannerInternal() {
        if (!Capacitor.isNativePlatform()) return;
        if (!this.shouldShowBanner) return;
        if (this.isBannerLoading || this.isBannerVisible) return;

        await this.initialize();
        if (!this.shouldShowBanner) return;

        this.clearRetry();

        if (this.hasBannerView) {
            try {
                await AdMob.resumeBanner();
                this.isBannerVisible = true;
                return;
            } catch (error) {
                this.hasBannerView = false;
                console.warn('AdMob: Failed to resume banner, requesting a fresh banner', error);
            }
        }

        try {
            const adId = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;
            this.isBannerLoading = true;
            this.scheduleLoadTimeout();

            await AdMob.showBanner({
                adId,
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: BANNER_BOTTOM_MARGIN,
                isTesting: SHOULD_USE_TEST_ADS,
            });
        } catch (error) {
            this.handleBannerLoadFailure(error);
        }
    }

    private async hideBannerInternal() {
        if (!Capacitor.isNativePlatform()) return;
        if (!this.hasBannerView && !this.isBannerLoading && !this.isBannerVisible) return;

        try {
            await AdMob.hideBanner();
            this.isBannerLoading = false;
            this.isBannerVisible = false;
            this.notifyBannerSize({ width: 0, height: 0 });
        } catch (error) {
            console.error('AdMob: Failed to hide banner', error);
            this.resetBannerState();
        }
    }

    private handleBannerLoadFailure(error: unknown) {
        this.clearLoadTimeout();
        this.isBannerLoading = false;
        this.isBannerVisible = false;
        this.hasBannerView = false;
        this.notifyBannerSize({ width: 0, height: 0 });

        const message = this.getErrorMessage(error);
        console.warn(`AdMob: Banner failed to load (${message})`);
        void AdMob.removeBanner().catch(() => {});

        if (this.shouldShowBanner) {
            this.scheduleRetry();
        }
    }

    private scheduleRetry() {
        if (this.retryTimeout) return;

        const delay = Math.min(
            INITIAL_RETRY_DELAY_MS * 2 ** this.retryAttempt,
            MAX_RETRY_DELAY_MS,
        );
        this.retryAttempt += 1;

        this.retryTimeout = setTimeout(() => {
            this.retryTimeout = undefined;
            if (this.shouldShowBanner) {
                void this.showBannerInternal();
            }
        }, delay);
    }

    private scheduleLoadTimeout() {
        this.clearLoadTimeout();

        this.loadTimeout = setTimeout(() => {
            if (this.isBannerLoading) {
                this.handleBannerLoadFailure(new Error('load timeout'));
            }
        }, LOAD_TIMEOUT_MS);
    }

    private clearRetry() {
        if (!this.retryTimeout) return;
        clearTimeout(this.retryTimeout);
        this.retryTimeout = undefined;
    }

    private clearLoadTimeout() {
        if (!this.loadTimeout) return;
        clearTimeout(this.loadTimeout);
        this.loadTimeout = undefined;
    }

    private resetBannerState() {
        this.hasBannerView = false;
        this.isBannerLoading = false;
        this.isBannerVisible = false;
        this.notifyBannerSize({ width: 0, height: 0 });
    }

    private notifyBannerSize(size: AdMobBannerSize) {
        this.lastBannerSize = size;
        this.bannerSizeListeners.forEach((listener) => listener(size));
    }

    private getErrorMessage(error: unknown) {
        if (this.isAdMobError(error)) {
            return `${error.code}: ${error.message}`;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private isAdMobError(error: unknown): error is AdMobError {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            'message' in error
        );
    }
}

export const adService = AdService.getInstance();
