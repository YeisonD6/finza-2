Pod::Spec.new do |s|
  s.name           = 'FinzaWidgets'
  s.version        = '0.1.0'
  s.summary        = 'Publishes the FINZA widget snapshot to the shared App Group.'
  s.description    = 'Writes the token-free widget snapshot to an App Group and reloads WidgetKit timelines.'
  s.license        = 'UNLICENSED'
  s.author         = 'FINZA'
  s.homepage       = 'https://github.com/rubxo/finza-2'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
