import UIKit
import Capacitor

@objc(FocusPomoSettingsPlugin)
public final class FocusPomoSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusPomoSettingsPlugin"
    public let jsName = "FocusPomoSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Unable to open app settings")
                return
            }
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Unable to open app settings")
                }
            }
        }
    }
}
