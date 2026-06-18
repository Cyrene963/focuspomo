import UIKit
import Capacitor

@objc(FocusPomoBridgeViewController)
final class FocusPomoBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FocusPomoSettingsPlugin())
    }
}
