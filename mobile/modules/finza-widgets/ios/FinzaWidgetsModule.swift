import ExpoModulesCore
import WidgetKit

/// JS bridge: src/features/widgets/native.ts. Same contract as the Android module.
/// The App Group comes from Info.plist (`FinzaAppGroup`, set by app.plugin.js); without
/// it the module reports itself unsupported and every call is a no-op.
public class FinzaWidgetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FinzaWidgets")

    Function("isSupported") { () -> Bool in
      Self.defaults() != nil
    }

    Function("publish") { (json: String) in
      guard let defaults = Self.defaults(),
            let data = json.data(using: .utf8),
            (try? JSONSerialization.jsonObject(with: data)) != nil
      else { return }
      defaults.set(json, forKey: "snapshot")
      Self.reload()
    }

    Function("getHideAmounts") { () -> Bool in
      Self.defaults()?.bool(forKey: "hide_amounts") ?? false
    }

    Function("setHideAmounts") { (hidden: Bool) in
      Self.defaults()?.set(hidden, forKey: "hide_amounts")
      Self.reload()
    }
  }

  static func defaults() -> UserDefaults? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "FinzaAppGroup") as? String,
          !group.isEmpty
    else { return nil }
    return UserDefaults(suiteName: group)
  }

  static func reload() {
    WidgetCenter.shared.reloadAllTimelines()
  }
}
