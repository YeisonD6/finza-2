// Extends app.json with sign-in plugins whose values come from the environment.
// Nothing here is secret; client IDs are public identifiers, but we never invent them.
module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? []), "expo-apple-authentication"];
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  // Android needs no plugin options (package + SHA-1 live in Google Cloud).
  // iOS requires the reversed iOS client ID as URL scheme; add it only when configured.
  plugins.push(
    iosUrlScheme
      ? ["@react-native-google-signin/google-signin", { iosUrlScheme }]
      : "@react-native-google-signin/google-signin",
  );
  // Home-screen widgets (modules/finza-widgets). iOS App Group only via env.
  plugins.push("./modules/finza-widgets/app.plugin.js");
  return {
    ...config,
    plugins,
    ios: { ...config.ios, usesAppleSignIn: true },
  };
};
