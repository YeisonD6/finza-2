package co.edu.unisabana.finza.widgets

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS bridge: src/features/widgets/native.ts. */
class FinzaWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FinzaWidgets")

    // Android widgets need no account setup: the receivers ship in this module's manifest.
    Function("isSupported") { true }

    Function("publish") { json: String ->
      val context = context()
      if (WidgetStore.save(context, json)) WidgetRenderer.refreshAll(context)
    }

    Function("getHideAmounts") {
      WidgetStore.hidden(context())
    }

    Function("setHideAmounts") { hidden: Boolean ->
      val context = context()
      WidgetStore.setHidden(context, hidden)
      WidgetRenderer.refreshAll(context)
    }
  }

  private fun context(): Context =
    appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()
}
