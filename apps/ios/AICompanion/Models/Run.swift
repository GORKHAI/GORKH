import Foundation

struct Run: Codable, Identifiable {
    let runId: String
    let deviceId: String
    let status: String
    let mode: String?
    let goal: String?
    let createdAt: TimeInterval
    let updatedAt: TimeInterval
    let startedAt: TimeInterval?
    let completedAt: TimeInterval?
    let error: String?
    let steps: [RunStep]?
    
    var id: String { runId }
    
    var statusColor: String {
        switch status {
        case "completed": return "green"
        case "failed", "error": return "red"
        case "running", "in_progress": return "blue"
        case "pending": return "orange"
        default: return "gray"
        }
    }
    
    var isActive: Bool {
        status == "running" || status == "in_progress" || status == "pending"
    }
}

struct RunStep: Codable, Identifiable {
    let stepId: String
    let type: String
    let status: String
    let content: String?
    let createdAt: TimeInterval
    let completedAt: TimeInterval?
    let error: String?
    
    var id: String { stepId }
}

struct RunsResponse: Codable {
    let runs: [Run]
}

struct RunResponse: Codable {
    let run: Run
}
