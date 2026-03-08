import Foundation

/// API Error types
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case decodingError(Error)
    case networkError(Error)
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, let message):
            return "HTTP \(statusCode): \(message)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        }
    }
}

/// API Client for AI Operator backend
@MainActor
class APIClient: ObservableObject {
    static let shared = APIClient()
    
    // MARK: - Configuration
    
    /// Base URL for API requests
    /// Change this to your API endpoint
    #if DEBUG
    private let baseURL = URL(string: "http://localhost:3000")!
    #else
    private let baseURL = URL(string: "https://api.aioperator.com")!
    #endif
    
    private let urlSession: URLSession
    
    // MARK: - Initialization
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.urlSession = URLSession(configuration: config)
    }
    
    // MARK: - Authentication
    
    /// Login with email and password
    func login(email: String, password: String) async throws -> LoginResponse {
        let request = LoginRequest(email: email, password: password)
        return try await post("/auth/login", body: request, requiresAuth: false)
    }
    
    /// Logout and clear stored credentials
    func logout() {
        KeychainManager.clearAll()
    }
    
    // MARK: - Devices
    
    /// Fetch all devices owned by the current user
    func fetchDevices() async throws -> [Device] {
        let response: DevicesResponse = try await get("/devices")
        return response.devices
    }
    
    /// Fetch a specific device
    func fetchDevice(deviceId: String) async throws -> Device {
        let response: DeviceResponse = try await get("/devices/\(deviceId)")
        return response.device
    }
    
    // MARK: - Runs
    
    /// Fetch all runs
    func fetchRuns() async throws -> [Run] {
        let response: RunsResponse = try await get("/runs")
        return response.runs
    }
    
    /// Fetch runs for a specific device
    func fetchRuns(deviceId: String) async throws -> [Run] {
        let response: RunsResponse = try await get("/devices/\(deviceId)/runs")
        return response.runs
    }
    
    /// Fetch a specific run
    func fetchRun(runId: String) async throws -> Run {
        let response: RunResponse = try await get("/runs/\(runId)")
        return response.run
    }
    
    // MARK: - Generic HTTP Methods
    
    private func get<T: Decodable>(_ path: String) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let token = KeychainManager.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        return try await performRequest(request)
    }
    
    private func post<T: Decodable, B: Encodable>(
        _ path: String,
        body: B,
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(body)
        
        if requiresAuth, let token = KeychainManager.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        return try await performRequest(request)
    }
    
    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await urlSession.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    return try JSONDecoder().decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
                
            case 401:
                // Token expired or invalid
                KeychainManager.clearAll()
                throw APIError.unauthorized
                
            default:
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw APIError.httpError(statusCode: httpResponse.statusCode, message: errorMessage)
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
}

// MARK: - Response Types

struct DeviceResponse: Codable {
    let device: Device
}
