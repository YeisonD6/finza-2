package co.edu.unisabana.finza.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.text.format.DateFormat
import android.text.format.DateUtils
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Builds the RemoteViews for each widget from the last published snapshot. */
internal object WidgetRenderer {
  private const val HIDDEN = "••••••"
  private const val HIDDEN_SPOKEN = "Monto oculto"
  private val spanish = Locale("es", "CO")

  fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    update(context, manager, SummaryWidgetProvider::class.java, ::summary)
    update(context, manager, BudgetWidgetProvider::class.java, ::budget)
    update(context, manager, ActionsWidgetProvider::class.java, ::actions)
  }

  private fun update(
    context: Context,
    manager: AppWidgetManager,
    provider: Class<*>,
    render: (Context) -> RemoteViews,
  ) {
    val ids = manager.getAppWidgetIds(ComponentName(context, provider))
    if (ids.isNotEmpty()) manager.updateAppWidget(ids, render(context))
  }

  /** Why the widget cannot show figures right now, or null when it can. */
  private fun blocker(snapshot: WidgetSnapshot?): String? = when {
    snapshot == null -> "Abre FINZA para ver tu resumen del mes."
    !snapshot.signedIn -> "Inicia sesión en FINZA para ver tu resumen."
    snapshot.month != WidgetStore.currentMonth() ->
      "Empezó un mes nuevo. Abre FINZA para actualizar."
    else -> null
  }

  fun summary(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.finza_widget_summary)
    views.setOnClickPendingIntent(R.id.finza_summary_root, openApp(context))
    val snapshot = WidgetStore.load(context)
    val message = blocker(snapshot)
    if (snapshot == null || message != null) {
      views.setTextViewText(R.id.finza_summary_title, "FINZA")
      views.setViewVisibility(R.id.finza_summary_updated, View.GONE)
      views.setViewVisibility(R.id.finza_summary_privacy, View.GONE)
      views.setViewVisibility(R.id.finza_summary_figures, View.GONE)
      views.setViewVisibility(R.id.finza_summary_message, View.VISIBLE)
      views.setTextViewText(R.id.finza_summary_message, message)
      clearAmounts(views)
      return views
    }
    val hidden = WidgetStore.hidden(context)
    views.setViewVisibility(R.id.finza_summary_message, View.GONE)
    views.setViewVisibility(R.id.finza_summary_figures, View.VISIBLE)
    views.setViewVisibility(R.id.finza_summary_privacy, View.VISIBLE)
    views.setTextViewText(
      R.id.finza_summary_title,
      "Balance de ${snapshot.monthLabel.lowercase(spanish)}",
    )
    updatedLine(context, snapshot.updatedAt)?.let {
      views.setViewVisibility(R.id.finza_summary_updated, View.VISIBLE)
      views.setTextViewText(R.id.finza_summary_updated, it)
    } ?: views.setViewVisibility(R.id.finza_summary_updated, View.GONE)

    amount(views, R.id.finza_summary_net, snapshot.net, snapshot.spokenNet, hidden)
    amount(views, R.id.finza_summary_income, snapshot.income, snapshot.spokenIncome, hidden)
    amount(views, R.id.finza_summary_expense, snapshot.expense, snapshot.spokenExpense, hidden)
    views.setTextColor(
      R.id.finza_summary_net,
      context.getColor(
        if (snapshot.netTone == "negative" && !hidden) R.color.finza_widget_on_forest_negative
        else R.color.finza_widget_on_forest,
      ),
    )
    views.setImageViewResource(
      R.id.finza_summary_privacy,
      if (hidden) R.drawable.finza_widget_ic_eye else R.drawable.finza_widget_ic_eye_off,
    )
    views.setContentDescription(
      R.id.finza_summary_privacy,
      if (hidden) "Mostrar montos" else "Ocultar montos",
    )
    views.setOnClickPendingIntent(R.id.finza_summary_privacy, togglePrivacy(context))
    return views
  }

  fun budget(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.finza_widget_budget)
    views.setOnClickPendingIntent(R.id.finza_budget_root, deepLink(context, "finza://budgets"))
    val snapshot = WidgetStore.load(context)
    val message = blocker(snapshot)
    val bars = listOf(
      R.id.finza_budget_bar_ok,
      R.id.finza_budget_bar_warning,
      R.id.finza_budget_bar_exceeded,
    )
    bars.forEach { views.setViewVisibility(it, View.GONE) }
    if (snapshot == null || message != null) {
      views.setTextViewText(R.id.finza_budget_title, "Presupuesto")
      views.setViewVisibility(R.id.finza_budget_name, View.GONE)
      views.setViewVisibility(R.id.finza_budget_percent, View.GONE)
      views.setViewVisibility(R.id.finza_budget_more, View.GONE)
      views.setTextViewText(R.id.finza_budget_detail, message)
      views.setContentDescription(R.id.finza_budget_detail, message)
      return views
    }
    views.setTextViewText(R.id.finza_budget_title, "Presupuesto · ${snapshot.monthLabel}")
    views.setViewVisibility(R.id.finza_budget_name, View.VISIBLE)
    val budget = snapshot.budget
    if (budget == null) {
      views.setTextViewText(R.id.finza_budget_name, "Sin presupuestos")
      views.setViewVisibility(R.id.finza_budget_percent, View.GONE)
      views.setViewVisibility(R.id.finza_budget_more, View.GONE)
      val invite = "Toca para crear uno y cuidar una categoría."
      views.setTextViewText(R.id.finza_budget_detail, invite)
      views.setContentDescription(R.id.finza_budget_detail, invite)
      return views
    }
    val hidden = WidgetStore.hidden(context)
    val (bar, color) = when (budget.status) {
      "exceeded" -> R.id.finza_budget_bar_exceeded to R.color.finza_widget_danger
      "warning" -> R.id.finza_budget_bar_warning to R.color.finza_widget_warning
      else -> R.id.finza_budget_bar_ok to R.color.finza_widget_accent
    }
    views.setViewVisibility(bar, View.VISIBLE)
    views.setProgressBar(bar, 100, budget.percent.coerceIn(0, 100), false)
    views.setTextViewText(R.id.finza_budget_name, budget.name)
    views.setViewVisibility(R.id.finza_budget_percent, View.VISIBLE)
    views.setTextViewText(R.id.finza_budget_percent, "${budget.percent} % usado")
    views.setTextColor(R.id.finza_budget_percent, context.getColor(color))
    views.setTextViewText(R.id.finza_budget_detail, if (hidden) HIDDEN else budget.detail)
    views.setContentDescription(
      R.id.finza_budget_detail,
      if (hidden) HIDDEN_SPOKEN else budget.detail,
    )
    val more = when {
      snapshot.budgetsTotal <= 1 -> null
      snapshot.budgetsAlert > 0 ->
        "${snapshot.budgetsAlert} de ${snapshot.budgetsTotal} cerca o sobre el límite"
      else -> "Tus ${snapshot.budgetsTotal} presupuestos van al día"
    }
    if (more == null) {
      views.setViewVisibility(R.id.finza_budget_more, View.GONE)
    } else {
      views.setViewVisibility(R.id.finza_budget_more, View.VISIBLE)
      views.setTextViewText(R.id.finza_budget_more, more)
    }
    return views
  }

  fun actions(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.finza_widget_actions)
    views.setOnClickPendingIntent(
      R.id.finza_action_expense,
      deepLink(context, "finza://movement/new?type=expense"),
    )
    views.setOnClickPendingIntent(
      R.id.finza_action_income,
      deepLink(context, "finza://movement/new?type=income"),
    )
    views.setOnClickPendingIntent(R.id.finza_action_list, deepLink(context, "finza://movements"))
    return views
  }

  /**
   * Hosts may reapply new RemoteViews onto the views already on screen, so text and
   * descriptions from a previous (possibly signed-out) state must be overwritten.
   */
  private fun clearAmounts(views: RemoteViews) {
    listOf(R.id.finza_summary_net, R.id.finza_summary_income, R.id.finza_summary_expense)
      .forEach {
        views.setTextViewText(it, "")
        views.setContentDescription(it, "")
      }
  }

  private fun amount(views: RemoteViews, id: Int, text: String, spoken: String, hidden: Boolean) {
    views.setTextViewText(id, if (hidden) HIDDEN else text)
    views.setContentDescription(id, if (hidden) HIDDEN_SPOKEN else spoken.ifEmpty { text })
  }

  private fun updatedLine(context: Context, at: Long?): String? {
    if (at == null) return null
    val time = if (DateUtils.isToday(at)) {
      DateFormat.getTimeFormat(context).format(Date(at))
    } else {
      SimpleDateFormat("d 'de' MMM", spanish).format(Date(at))
    }
    return "Actualizado $time"
  }

  private fun openApp(context: Context): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_VIEW, Uri.parse("finza://")).setPackage(context.packageName)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, 0, intent, FLAGS)
  }

  private fun deepLink(context: Context, url: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, url.hashCode(), intent, FLAGS)
  }

  private fun togglePrivacy(context: Context): PendingIntent {
    val intent = Intent(context, SummaryWidgetProvider::class.java)
      .setAction(SummaryWidgetProvider.ACTION_TOGGLE_PRIVACY)
    return PendingIntent.getBroadcast(context, 1, intent, FLAGS)
  }

  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
}
