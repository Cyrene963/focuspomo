import Foundation
import UIKit
import CoreMotion
import Capacitor

@objc(FocusPomoMotionPlugin)
public final class FocusPomoMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusPomoMotionPlugin"
    public let jsName = "FocusPomoMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let motionManager = CMMotionManager()
    private let motionQueue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "me.cyrene.focuspomo.motion"
        queue.maxConcurrentOperationCount = 1
        queue.qualityOfService = .userInitiated
        return queue
    }()

    private var shouldRun = false
    private var isRunning = false
    private var observersInstalled = false

    deinit {
        NotificationCenter.default.removeObserver(self)
        motionManager.stopDeviceMotionUpdates()
    }

    @objc override public func load() {
        installObservers()
    }

    @objc func start(_ call: CAPPluginCall) {
        shouldRun = true
        installObservers()

        let available = motionManager.isDeviceMotionAvailable
        if available {
            startMotionIfNeeded()
        } else {
            stopMotion()
        }

        call.resolve(["available": available])
    }

    @objc func stop(_ call: CAPPluginCall) {
        shouldRun = false
        stopMotion()
        call.resolve()
    }

    private func installObservers() {
        guard !observersInstalled else { return }
        observersInstalled = true

        NotificationCenter.default.addObserver(self, selector: #selector(handleDidBecomeActive(_:)), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleDidEnterBackground(_:)), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    @objc private func handleDidBecomeActive(_ notification: Notification) {
        if shouldRun {
            startMotionIfNeeded()
        }
    }

    @objc private func handleDidEnterBackground(_ notification: Notification) {
        stopMotion()
    }

    private func startMotionIfNeeded() {
        guard shouldRun, motionManager.isDeviceMotionAvailable, !isRunning else { return }

        isRunning = true
        motionManager.deviceMotionUpdateInterval = 1.0 / 30.0
        motionManager.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: motionQueue) { [weak self] motion, error in
            guard let self else { return }

            if let error {
                CAPLog.print("⚡️ FocusPomoMotion error \(error.localizedDescription)")
                return
            }

            guard self.shouldRun, let motion else { return }
            let gravity = motion.gravity
            let payload: [String: Any] = [
                "x": gravity.x * 9.80665,
                "y": gravity.y * 9.80665,
                "z": gravity.z * 9.80665,
                "source": "native-motion"
            ]

            DispatchQueue.main.async { [weak self] in
                guard let self, self.shouldRun else { return }
                self.notifyListeners("accel", data: payload)
            }
        }
    }

    private func stopMotion() {
        guard isRunning else { return }
        motionManager.stopDeviceMotionUpdates()
        isRunning = false
    }
}
