/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_URL?: string
    readonly VITE_ADMOB_ANDROID_BANNER_ID?: string
    readonly VITE_ADMOB_IOS_BANNER_ID?: string
    readonly VITE_ADMOB_TEST_ADS?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
