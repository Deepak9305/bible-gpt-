// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),
        .package(name: "CapacitorCommunityAdmob", path: "..\..\..\node_modules\@capacitor-community\admob"),
        .package(name: "CapacitorCommunityTextToSpeech", path: "..\..\..\node_modules\@capacitor-community\text-to-speech"),
        .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app"),
        .package(name: "CapacitorBrowser", path: "..\..\..\node_modules\@capacitor\browser"),
        .package(name: "CapacitorClipboard", path: "..\..\..\node_modules\@capacitor\clipboard"),
        .package(name: "CapacitorDevice", path: "..\..\..\node_modules\@capacitor\device"),
        .package(name: "CapacitorFilesystem", path: "..\..\..\node_modules\@capacitor\filesystem"),
        .package(name: "CapacitorKeyboard", path: "..\..\..\node_modules\@capacitor\keyboard"),
        .package(name: "CapacitorLocalNotifications", path: "..\..\..\node_modules\@capacitor\local-notifications"),
        .package(name: "CapacitorNetwork", path: "..\..\..\node_modules\@capacitor\network"),
        .package(name: "CapacitorPreferences", path: "..\..\..\node_modules\@capacitor\preferences"),
        .package(name: "CapacitorPushNotifications", path: "..\..\..\node_modules\@capacitor\push-notifications"),
        .package(name: "CapacitorScreenOrientation", path: "..\..\..\node_modules\@capacitor\screen-orientation"),
        .package(name: "CapacitorShare", path: "..\..\..\node_modules\@capacitor\share"),
        .package(name: "CapacitorSplashScreen", path: "..\..\..\node_modules\@capacitor\splash-screen"),
        .package(name: "CapacitorStatusBar", path: "..\..\..\node_modules\@capacitor\status-bar"),
        .package(name: "CapacitorPluginAppTrackingTransparency", path: "..\..\..\node_modules\capacitor-plugin-app-tracking-transparency"),
        .package(name: "CordovaPluginPurchase", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginPurchase")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityAdmob", package: "CapacitorCommunityAdmob"),
                .product(name: "CapacitorCommunityTextToSpeech", package: "CapacitorCommunityTextToSpeech"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorClipboard", package: "CapacitorClipboard"),
                .product(name: "CapacitorDevice", package: "CapacitorDevice"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "CapacitorNetwork", package: "CapacitorNetwork"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapacitorScreenOrientation", package: "CapacitorScreenOrientation"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "CapacitorPluginAppTrackingTransparency", package: "CapacitorPluginAppTrackingTransparency"),
                .product(name: "CordovaPluginPurchase", package: "CordovaPluginPurchase")
            ]
        )
    ]
)
