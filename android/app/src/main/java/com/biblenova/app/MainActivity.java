package com.biblenova.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(SocialLoginPlugin.class);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required by Capgo SocialLoginPlugin
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        SocialLoginPlugin socialLoginPlugin = (SocialLoginPlugin) this.getBridge().getPlugin("SocialLogin")
                .getInstance();
        if (socialLoginPlugin != null) {
            socialLoginPlugin.handleGoogleLoginIntent(requestCode, data);
            socialLoginPlugin.handleAppleLoginIntent(data);
        }
    }
}
