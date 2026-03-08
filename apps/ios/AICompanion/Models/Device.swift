import Foundation

struct Device: Codable, Identifiable {
    let deviceId: String
    let deviceName: String?
    let platform: String
    let appVersion: String?
    let connected: Bool
    let paired: Bool
    let pairingCode: String?
    let pairingExpiresAt: TimeInterval?
    let lastSeenAt: TimeInterval
    let controlState: ControlState
    let screenStreamState: ScreenStreamState?
    let workspaceState: WorkspaceState
    
    var id: String { deviceId }
    var displayName: String { deviceName ?? deviceId }
}

struct ControlState: Codable {
    let enabled: Bool
    let updatedAt: TimeInterval
}

struct ScreenStreamState: Codable {
    let enabled: Bool
    let fps: Int
    let displayId: String?
}

struct WorkspaceState: Codable {
    let configured: Bool
    let rootName: String?
}

struct DevicesResponse: Codable {
    let devices: [Device]
}
