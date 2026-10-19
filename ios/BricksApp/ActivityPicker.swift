import FamilyControls
import SwiftUI
import UIKit

private struct ActivityPickerView: View {
  @State var selection: FamilyActivitySelection
  let onFinish: (FamilyActivitySelection?) -> Void

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Cancel") { onFinish(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("Done") { onFinish(selection) } }
        }
    }
  }
}

enum ActivityPicker {
  /// Presents Apple's app picker. `completion` gets the new selection, or nil if the user cancelled.
  static func present(initial: FamilyActivitySelection, completion: @escaping (FamilyActivitySelection?) -> Void) -> Bool {
    guard let presenter = topViewController() else { return false }
    var host: UIHostingController<ActivityPickerView>?
    let view = ActivityPickerView(selection: initial) { result in
      host?.dismiss(animated: true) { completion(result) }
    }
    let controller = UIHostingController(rootView: view)
    // A swipe-down would skip both buttons and leave the JS promise unresolved.
    controller.isModalInPresentation = true
    host = controller
    presenter.present(controller, animated: true)
    return true
  }

  private static func topViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
    var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}
