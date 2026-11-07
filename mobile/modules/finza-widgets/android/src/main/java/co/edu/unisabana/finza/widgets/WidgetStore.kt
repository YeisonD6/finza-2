package co.edu.unisabana.finza.widgets

import android.content.Context
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

internal data class WidgetBudget(
  val name: String,
  val percent: Int,
  val status: String,
  val detail: String,
)

/** Mirror of src/features/widgets/snapshot.ts. Holds no token, e-mail or account id. */
internal data class WidgetSnapshot(
  val signedIn: Boolean,
  val month: String,
  val monthLabel: String,
  val net: String,
  val netTone: String,
  val income: String,
  val expense: String,
  val spokenNet: String,
  val spokenIncome: String,
  val spokenExpense: String,
  val budget: WidgetBudget?,
  val budgetsTotal: Int,
  val budgetsAlert: Int,
  val updatedAt: Long?,
)

/**
 * App-private SharedPreferences shared by the module (writer) and the widget providers
 * (readers). Nothing here leaves the device or is readable by other apps.
 */
internal object WidgetStore {
  private const val PREFS = "finza_widgets"
  private const val KEY_SNAPSHOT = "snapshot"
  private const val KEY_HIDDEN = "hide_amounts"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Stores the snapshot only when it parses, so a bad payload never blanks a widget. */
  fun save(context: Context, json: String): Boolean {
    if (parse(json) == null) return false
    prefs(context).edit().putString(KEY_SNAPSHOT, json).apply()
    return true
  }

  fun load(context: Context): WidgetSnapshot? =
    prefs(context).getString(KEY_SNAPSHOT, null)?.let(::parse)

  fun hidden(context: Context): Boolean = prefs(context).getBoolean(KEY_HIDDEN, false)

  fun setHidden(context: Context, hidden: Boolean) {
    prefs(context).edit().putBoolean(KEY_HIDDEN, hidden).apply()
  }

  /** Current accounting month in Bogotá, matching bogotaToday() in the app. */
  fun currentMonth(): String {
    val now = Calendar.getInstance(TimeZone.getTimeZone("America/Bogota"))
    return String.format(Locale.US, "%04d-%02d", now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1)
  }

  private fun parse(json: String): WidgetSnapshot? = try {
    val root = JSONObject(json)
    if (root.optInt("v") != 1) {
      null
    } else {
      val budget = root.optJSONObject("budget")?.let {
        WidgetBudget(
          name = it.getString("name"),
          percent = it.getInt("percent"),
          status = it.getString("status"),
          detail = it.getString("detail"),
        )
      }
      val spoken = root.optJSONObject("spoken")
      WidgetSnapshot(
        signedIn = root.getBoolean("signedIn"),
        month = root.optString("month"),
        monthLabel = root.optString("monthLabel"),
        net = root.optString("net"),
        netTone = root.optString("netTone", "zero"),
        income = root.optString("income"),
        expense = root.optString("expense"),
        spokenNet = spoken?.optString("net").orEmpty(),
        spokenIncome = spoken?.optString("income").orEmpty(),
        spokenExpense = spoken?.optString("expense").orEmpty(),
        budget = budget,
        budgetsTotal = root.optInt("budgetsTotal"),
        budgetsAlert = root.optInt("budgetsAlert"),
        updatedAt = parseIso(root.optString("updatedAt")),
      )
    }
  } catch (_: Exception) {
    null
  }

  // Date.toISOString() always produces this shape; java.time needs API 26 (minSdk is 24).
  private fun parseIso(value: String): Long? = try {
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      .apply { timeZone = TimeZone.getTimeZone("UTC") }
      .parse(value)
      ?.time
  } catch (_: Exception) {
    null
  }
}
