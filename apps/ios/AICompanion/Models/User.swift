import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let token: String
    let user: User
}

struct AuthError: Codable, Error {
    let error: String
}
