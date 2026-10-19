import ManagedSettings
import ManagedSettingsUI
import UIKit

/// The "Not right now" screen iOS shows over a blocked app. Mirrors Android's BlockedActivity.
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  private let background = UIColor(red: 0x0B / 255, green: 0x0B / 255, blue: 0x0D / 255, alpha: 1)
  private let ink = UIColor(red: 0xF5 / 255, green: 0xF5 / 255, blue: 0xF2 / 255, alpha: 1)
  private let muted = UIColor(red: 0x9A / 255, green: 0x9A / 255, blue: 0xA0 / 255, alpha: 1)
  private let red = UIColor(red: 0xE5 / 255, green: 0x24 / 255, blue: 0x2B / 255, alpha: 1)

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    make(name: application.localizedDisplayName)
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    make(name: application.localizedDisplayName)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    make(name: webDomain.domain)
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    make(name: webDomain.domain)
  }

  private func make(name: String?) -> ShieldConfiguration {
    let session = FaslaShared.loadSession()
    var lines = ["\(name ?? "This app") can wait."]
    if let intention = session?.intention?.trimmingCharacters(in: .whitespaces), !intention.isEmpty {
      lines.append("You’re here to: \(intention)")
    }
    if let key = session?.keyName, !key.isEmpty {
      lines.append("Tap \(key) to end the session")
    }
    return ShieldConfiguration(
      backgroundBlurStyle: nil,
      backgroundColor: background,
      icon: keyIcon(),
      title: ShieldConfiguration.Label(text: "Not right now.", color: ink),
      subtitle: ShieldConfiguration.Label(text: lines.joined(separator: "\n"), color: muted),
      primaryButtonLabel: ShieldConfiguration.Label(text: "Back to focus", color: .white),
      primaryButtonBackgroundColor: red,
      secondaryButtonLabel: nil
    )
  }

  /// The red key card, drawn here because the shield can only show a UIImage.
  private func keyIcon() -> UIImage {
    let size = CGSize(width: 96, height: 60)
    return UIGraphicsImageRenderer(size: size).image { _ in
      red.setFill()
      UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 10).fill()
      let text = "fasla" as NSString
      let attributes: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: 24, weight: .black),
        .foregroundColor: background,
      ]
      let textSize = text.size(withAttributes: attributes)
      text.draw(at: CGPoint(x: (size.width - textSize.width) / 2, y: (size.height - textSize.height) / 2), withAttributes: attributes)
    }
  }
}
