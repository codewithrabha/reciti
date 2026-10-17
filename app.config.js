// Dynamic Expo config.
//
// Keeps app.json as the static base and overrides:
// 1. android.googleServicesFile (cloud vs local secrets)
// 2. expo-build-properties for Android R8 minification, resource shrinking, and ProGuard keep rules.
module.exports = ({ config }) => {
  const extraProguardRules = [
    '# General Attributes',
    '-keepattributes *Annotation*',
    '-keepattributes Signature',
    '-keepattributes InnerClasses',
    '-keepattributes EnclosingMethod',
    '-keepattributes SourceFile,LineNumberTable',
    '',
    '# React Native Core, Props & TurboModules',
    '-keep class com.facebook.react.turbomodule.** { *; }',
    '-keep class com.facebook.react.bridge.** { *; }',
    '-keep class com.facebook.react.uimanager.** { *; }',
    '-keepclassmembers class * {',
    '    @com.facebook.react.uimanager.annotations.ReactProp <methods>;',
    '    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;',
    '}',
    '-keep class com.facebook.react.module.annotations.** { *; }',
    '-dontwarn com.facebook.react.**',
    '',
    '# Reanimated & Worklets',
    '-keep class com.swmansion.reanimated.** { *; }',
    '-keep class com.worklets.** { *; }',
    '-dontwarn com.swmansion.reanimated.**',
    '',
    '# Firebase & Google Services',
    '-keep class com.google.firebase.** { *; }',
    '-dontwarn com.google.firebase.**',
    '-keep class com.google.android.gms.** { *; }',
    '-dontwarn com.google.android.gms.**',
    '-keepclassmembers class * {',
    '    @com.google.firebase.remoteconfig.** <fields>;',
    '}',
    '',
    '# Google Sign-In',
    '-keep class com.reactnativegooglesignin.** { *; }',
    '-dontwarn com.reactnativegooglesignin.**',
    '',
    '# Expo Modules & AsyncStorage',
    '-keep class expo.modules.** { *; }',
    '-keep class com.reactnativecommunity.asyncstorage.** { *; }',
    '-dontwarn expo.modules.**',
  ].join('\n');

  const plugins = [
    ...(config.plugins || []),
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules,
        },
      },
    ],
  ];

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        config.android?.googleServicesFile ??
        './google-services.json',
    },
  };
};

