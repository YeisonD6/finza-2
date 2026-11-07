// FINZA home-screen and Lock Screen widgets (WidgetKit, iOS 17+).
//
// NOT BUILT IN CI: this file belongs to a Widget Extension target that must be added in
// Xcode after `npx expo prebuild --platform ios` (see docs/engineering/widgets.md).
// It reads the same token-free snapshot the Android widgets read, published by
// src/features/widgets/useWidgetSync.ts through modules/finza-widgets.

import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Shared snapshot (mirror of src/features/widgets/snapshot.ts)

struct WidgetBudget: Codable {
  let name: String
  let percent: Int
  let status: String
  let detail: String
}

struct Spoken: Codable {
  let net: String
  let income: String
  let expense: String
}

struct WidgetSnapshot: Codable {
  let v: Int
  let signedIn: Bool
  let month: String
  let monthLabel: String
  let net: String
  let netTone: String
  let income: String
  let expense: String
  let spoken: Spoken?
  let budget: WidgetBudget?
  let budgetsTotal: Int
  let budgetsAlert: Int
  let updatedAt: String
}

enum SharedStore {
  static var defaults: UserDefaults? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "FinzaAppGroup") as? String
    else { return nil }
    return UserDefaults(suiteName: group)
  }

  static func snapshot() -> WidgetSnapshot? {
    guard let json = defaults?.string(forKey: "snapshot"),
          let data = json.data(using: .utf8),
          let value = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
          value.v == 1
    else { return nil }
    return value
  }

  static var hidden: Bool { defaults?.bool(forKey: "hide_amounts") ?? false }

  /// Accounting month in Bogotá, matching bogotaToday() in the app.
  static func currentMonth(_ date: Date = .now) -> String {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "America/Bogota") ?? .current
    let parts = calendar.dateComponents([.year, .month], from: date)
    return String(format: "%04d-%02d", parts.year ?? 0, parts.month ?? 0)
  }
}

// MARK: - Timeline

struct FinzaEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
  let hidden: Bool

  /// Why figures cannot be shown, or nil when they can (same copy as Android).
  var blocker: String? {
    guard let snapshot else { return "Abre FINZA para ver tu resumen del mes." }
    if !snapshot.signedIn { return "Inicia sesión en FINZA para ver tu resumen." }
    if snapshot.month != SharedStore.currentMonth(date) {
      return "Empezó un mes nuevo. Abre FINZA para actualizar."
    }
    return nil
  }
}

struct FinzaProvider: TimelineProvider {
  func placeholder(in context: Context) -> FinzaEntry {
    FinzaEntry(date: .now, snapshot: nil, hidden: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (FinzaEntry) -> Void) {
    completion(FinzaEntry(date: .now, snapshot: SharedStore.snapshot(), hidden: SharedStore.hidden))
  }

  // Widgets hold no session and never call the API: the app reloads timelines when it
  // publishes. The 30-minute refresh only re-checks for a new month.
  func getTimeline(in context: Context, completion: @escaping (Timeline<FinzaEntry>) -> Void) {
    let entry = FinzaEntry(date: .now, snapshot: SharedStore.snapshot(), hidden: SharedStore.hidden)
    completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(30 * 60))))
  }
}

// MARK: - Brote palette (src/shared/theme/tokens.ts)

extension Color {
  static let forest700 = Color(red: 0x1E / 255, green: 0x46 / 255, blue: 0x34 / 255)
  static let onForest = Color(red: 0xF4 / 255, green: 0xF7 / 255, blue: 0xF2 / 255)
  static let onForestMuted = Color(red: 0xC9 / 255, green: 0xD8 / 255, blue: 0xC6 / 255)
  static let onForestNegative = Color(red: 0xF3 / 255, green: 0xC4 / 255, blue: 0xBE / 255)
  static let progress = Color(red: 0x5E / 255, green: 0x8B / 255, blue: 0x6A / 255)
  static let warning = Color(red: 0x8A / 255, green: 0x5A / 255, blue: 0x00 / 255)
  static let danger = Color(red: 0x8C / 255, green: 0x3A / 255, blue: 0x4E / 255)
  static let sage100 = Color(red: 0xE2 / 255, green: 0xEB / 255, blue: 0xDF / 255)
}

private let hiddenText = "••••••"

// MARK: - Privacy toggle (interactive, iOS 17)

struct TogglePrivacyIntent: AppIntent {
  static var title: LocalizedStringResource = "Ocultar o mostrar montos"

  func perform() async throws -> some IntentResult {
    let defaults = SharedStore.defaults
    defaults?.set(!(defaults?.bool(forKey: "hide_amounts") ?? false), forKey: "hide_amounts")
    return .result()
  }
}

// MARK: - Resumen del mes

struct SummaryView: View {
  let entry: FinzaEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    if let message = entry.blocker {
      Text(message)
        .font(.subheadline)
        .foregroundStyle(Color.onForest)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else if let snapshot = entry.snapshot {
      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .top) {
          Image("Monedin")
            .resizable()
            .scaledToFit()
            .frame(width: 28, height: 28)
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 0) {
            Text("Balance de \(snapshot.monthLabel.lowercased())")
              .font(.footnote.weight(.semibold))
              .foregroundStyle(Color.onForest)
            if let date = ISO8601DateFormatter.withFractions.date(from: snapshot.updatedAt) {
              Text("Actualizado \(date, style: .time)")
                .font(.caption2)
                .foregroundStyle(Color.onForestMuted)
            }
          }
          Spacer(minLength: 0)
          Button(intent: TogglePrivacyIntent()) {
            Image(systemName: entry.hidden ? "eye" : "eye.slash")
              .foregroundStyle(Color.onForest)
          }
          .buttonStyle(.plain)
          .accessibilityLabel(entry.hidden ? "Mostrar montos" : "Ocultar montos")
        }
        Text(entry.hidden ? hiddenText : snapshot.net)
          .font(.system(size: 28, weight: .bold).monospacedDigit())
          .minimumScaleFactor(0.5)
          .lineLimit(1)
          .foregroundStyle(
            snapshot.netTone == "negative" && !entry.hidden ? Color.onForestNegative : Color.onForest
          )
          .accessibilityLabel(entry.hidden ? "Monto oculto" : snapshot.spoken?.net ?? snapshot.net)
          .privacySensitive()
        if family != .systemSmall {
          HStack(spacing: 12) {
            figure("Ingresos", snapshot.income, snapshot.spoken?.income)
            figure("Gastos", snapshot.expense, snapshot.spoken?.expense)
          }
        }
      }
    }
  }

  private func figure(_ label: String, _ value: String, _ spoken: String?) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(label).font(.caption).foregroundStyle(Color.onForestMuted)
      Text(entry.hidden ? hiddenText : value)
        .font(.subheadline.weight(.semibold).monospacedDigit())
        .foregroundStyle(Color.onForest)
        .lineLimit(1)
        .privacySensitive()
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(entry.hidden ? "\(label): monto oculto" : spoken ?? "\(label) \(value)")
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct SummaryWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FinzaSummary", provider: FinzaProvider()) { entry in
      SummaryView(entry: entry)
        .containerBackground(Color.forest700, for: .widget)
        .widgetURL(URL(string: "finza://"))
    }
    .configurationDisplayName("Resumen del mes")
    .description("Balance, ingresos y gastos del mes en curso.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Presupuesto

struct BudgetView: View {
  let entry: FinzaEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(entry.blocker == nil ? "Presupuesto · \(entry.snapshot?.monthLabel ?? "")" : "Presupuesto")
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
      if let message = entry.blocker {
        Text(message).font(.footnote)
      } else if let budget = entry.snapshot?.budget {
        Text(budget.name).font(.headline).lineLimit(1)
        ProgressView(value: Double(min(budget.percent, 100)), total: 100)
          .tint(tint(budget.status))
          .accessibilityHidden(true)
        Text("\(budget.percent) % usado")
          .font(.subheadline.weight(.semibold).monospacedDigit())
          .foregroundStyle(tint(budget.status))
        Text(entry.hidden ? hiddenText : budget.detail)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
          .privacySensitive()
      } else {
        Text("Sin presupuestos").font(.headline)
        Text("Toca para crear uno y cuidar una categoría.").font(.caption).foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func tint(_ status: String) -> Color {
    switch status {
    case "exceeded": return .danger
    case "warning": return .warning
    default: return .forest700
    }
  }
}

struct BudgetWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FinzaBudget", provider: FinzaProvider()) { entry in
      BudgetView(entry: entry)
        .containerBackground(.background, for: .widget)
        .widgetURL(URL(string: "finza://budgets"))
    }
    .configurationDisplayName("Presupuesto")
    .description("El presupuesto más cerca de su límite.")
    .supportedFamilies([.systemSmall])
  }
}

// MARK: - Atajos

struct ActionsView: View {
  var body: some View {
    HStack(spacing: 8) {
      shortcut("Gasto", "minus", "finza://movement/new?type=expense", primary: true)
      shortcut("Ingreso", "plus", "finza://movement/new?type=income", primary: false)
      shortcut("Historial", "list.bullet", "finza://movements", primary: false)
    }
  }

  private func shortcut(_ label: String, _ symbol: String, _ url: String, primary: Bool) -> some View {
    Link(destination: URL(string: url)!) {
      Label(label, systemImage: symbol)
        .font(.subheadline.weight(.semibold))
        .frame(maxWidth: .infinity, minHeight: 48)
        .foregroundStyle(primary ? Color.onForest : Color.forest700)
        .background(primary ? Color.forest700 : Color.sage100, in: RoundedRectangle(cornerRadius: 16))
    }
    .accessibilityLabel(label == "Historial" ? "Ver tus movimientos" : "Registrar un \(label.lowercased())")
  }
}

struct ActionsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FinzaActions", provider: FinzaProvider()) { _ in
      ActionsView().containerBackground(.background, for: .widget)
    }
    .configurationDisplayName("Atajos")
    .description("Registra un gasto o un ingreso en un toque.")
    .supportedFamilies([.systemMedium])
  }
}

// MARK: - Lock Screen (P2): balance line, redacted while the device is locked

struct LockScreenWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FinzaLockScreen", provider: FinzaProvider()) { entry in
      VStack(alignment: .leading) {
        Text(entry.blocker == nil ? "Balance de \(entry.snapshot?.monthLabel.lowercased() ?? "")" : "FINZA")
          .font(.caption2)
        Text(entry.blocker ?? (entry.hidden ? hiddenText : entry.snapshot?.net ?? ""))
          .font(.headline.monospacedDigit())
          .privacySensitive()
      }
      .containerBackground(.clear, for: .widget)
      .widgetURL(URL(string: "finza://"))
    }
    .configurationDisplayName("Balance")
    .description("Tu balance del mes en la pantalla bloqueada.")
    .supportedFamilies([.accessoryRectangular])
  }
}

extension ISO8601DateFormatter {
  static let withFractions: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()
}

@main
struct FinzaWidgetBundle: WidgetBundle {
  var body: some Widget {
    SummaryWidget()
    BudgetWidget()
    ActionsWidget()
    LockScreenWidget()
  }
}
