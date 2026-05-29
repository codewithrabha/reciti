// Dynamic Expo config.
//
// Keeps app.json as the static base and only overrides
// android.googleServicesFile. In EAS cloud builds the file comes from the
// "file" environment variable GOOGLE_SERVICES_JSON (EAS writes it to disk and
// sets this var to its path); local builds fall back to the committed-but-
// gitignored ./google-services.json. This keeps the file out of version
// control without breaking cloud builds.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ??
      config.android?.googleServicesFile ??
      './google-services.json',
  },
});
