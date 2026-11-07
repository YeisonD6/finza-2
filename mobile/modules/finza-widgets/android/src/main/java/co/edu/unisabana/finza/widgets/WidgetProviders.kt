package co.edu.unisabana.finza.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * The providers only draw what the app last published: widgets hold no session, so
 * they never call the API. The periodic update (30 min) refreshes the "updated at"
 * line and notices a new month.
 */
abstract class FinzaWidgetProvider : AppWidgetProvider() {
  internal abstract fun render(context: Context): RemoteViews

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    manager.updateAppWidget(ids, render(context))
  }
}

class SummaryWidgetProvider : FinzaWidgetProvider() {
  override fun render(context: Context) = WidgetRenderer.summary(context)

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_TOGGLE_PRIVACY) {
      WidgetStore.setHidden(context, !WidgetStore.hidden(context))
      WidgetRenderer.refreshAll(context)
      return
    }
    super.onReceive(context, intent)
  }

  companion object {
    const val ACTION_TOGGLE_PRIVACY = "co.edu.unisabana.finza.widgets.TOGGLE_PRIVACY"
  }
}

class BudgetWidgetProvider : FinzaWidgetProvider() {
  override fun render(context: Context) = WidgetRenderer.budget(context)
}

class ActionsWidgetProvider : FinzaWidgetProvider() {
  override fun render(context: Context) = WidgetRenderer.actions(context)
}
