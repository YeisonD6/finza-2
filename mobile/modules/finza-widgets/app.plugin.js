// Config plugin for modules/finza-widgets.
// Android: points backup rules at the module's own files, which keep expo-secure-store's
// exclusions and also exclude the widget snapshot (finza_widgets.xml) from cloud backup
// and device transfer. The widget receivers themselves ship in the module's manifest.
// iOS: adds the App Group the widget extension reads from. Opt-in through
// FINZA_IOS_APP_GROUP (e.g. "group.co.edu.unisabana.finza") because the group must
// first exist in the Apple Developer account; nothing is invented here.
const {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require("expo/config-plugins");

function withBackupRules(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:fullBackupContent"] = "@xml/finza_backup_rules";
      application.$["android:dataExtractionRules"] =
        "@xml/finza_data_extraction_rules";
    }
    return mod;
  });
}

function withAppGroup(config, group) {
  config = withEntitlementsPlist(config, (mod) => {
    const key = "com.apple.security.application-groups";
    mod.modResults[key] = [...new Set([...(mod.modResults[key] ?? []), group])];
    return mod;
  });
  return withInfoPlist(config, (mod) => {
    mod.modResults.FinzaAppGroup = group;
    return mod;
  });
}

module.exports = function withFinzaWidgets(config) {
  config = withBackupRules(config);
  const group = process.env.FINZA_IOS_APP_GROUP;
  return group ? withAppGroup(config, group) : config;
};
