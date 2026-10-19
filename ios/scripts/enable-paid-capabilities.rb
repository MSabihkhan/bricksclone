# Wires the entitlements files into the three iOS targets. Run once you are on the paid
# Apple Developer Program and Apple has approved Family Controls for all three bundle ids:
#   GEM_PATH="$(brew --prefix cocoapods)/libexec" ruby ios/scripts/enable-paid-capabilities.rb
# A free Personal Team cannot sign these entitlements, so the project leaves them off by default.
require 'xcodeproj'

FILES = {
  'BricksApp' => 'BricksApp/BricksApp.entitlements',
  'FaslaShield' => 'FaslaShield/FaslaShield.entitlements',
  'FaslaMonitor' => 'FaslaMonitor/FaslaMonitor.entitlements',
}.freeze

path = File.expand_path('../BricksApp.xcodeproj', __dir__)
project = Xcodeproj::Project.open(path)
FILES.each do |target_name, entitlements|
  target = project.targets.find { |t| t.name == target_name } or abort "missing target #{target_name}"
  target.build_configurations.each { |config| config.build_settings['CODE_SIGN_ENTITLEMENTS'] = entitlements }
end
project.save
puts 'Entitlements enabled. Select your paid team on all three targets in Xcode and build.'
