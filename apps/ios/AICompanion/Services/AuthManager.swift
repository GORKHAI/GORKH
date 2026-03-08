import Foundation
import SwiftUI
import Combine

/// Manages authentication state for the app
@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: User?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let apiClient = APIClient.shared
    
    private init() {
        // Check for existing session on startup
        checkExistingSession()
    }
    
    /// Check if we have a valid token stored
    private func checkExistingSession() {
        if let token = KeychainManager.getToken(),
           let user = KeychainManager.getUser() {
            self.currentUser = user
            self.isAuthenticated = true
        }
    }
    
    /// Login with email and password
    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await apiClient.login(email: email, password: password)
            
            // Save to keychain
            if KeychainManager.saveToken(response.token) &&
               KeychainManager.saveUser(response.user) {
                self.currentUser = response.user
                self.isAuthenticated = true
            } else {
                self.errorMessage = "Failed to save credentials"
            }
        } catch APIError.httpError(let statusCode, let message) {
            if statusCode == 401 {
                self.errorMessage = "Invalid email or password"
            } else {
                self.errorMessage = "Login failed: \(message)"
            }
        } catch APIError.networkError {
            self.errorMessage = "Network error. Please check your connection."
        } catch {
            self.errorMessage = "An unexpected error occurred"
        }
        
        isLoading = false
    }
    
    /// Logout the current user
    func logout() {
        apiClient.logout()
        currentUser = nil
        isAuthenticated = false
        errorMessage = nil
    }
}
