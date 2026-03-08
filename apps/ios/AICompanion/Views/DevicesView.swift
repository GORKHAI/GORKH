import SwiftUI

struct DevicesView: View {
    @StateObject private var apiClient = APIClient.shared
    @State private var devices: [Device] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedDevice: Device?
    
    var body: some View {
        NavigationView {
            List {
                if devices.isEmpty && !isLoading {
                    Section {
                        VStack(spacing: 12) {
                            Image(systemName: "desktopcomputer")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            
                            Text("No Devices")
                                .font(.headline)
                            
                            Text("Pair a device from your desktop app to see it here.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    }
                }
                
                Section {
                    ForEach(devices) { device in
                        NavigationLink(destination: DeviceDetailView(device: device)) {
                            DeviceRow(device: device)
                        }
                    }
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Devices")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: logout) {
                        Text("Logout")
                            .foregroundColor(.red)
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: loadDevices) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isLoading)
                }
            }
            .refreshable {
                await loadDevicesAsync()
            }
            .onAppear {
                loadDevices()
            }
            .alert("Error", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                }
            }
        }
    }
    
    private func loadDevices() {
        Task {
            await loadDevicesAsync()
        }
    }
    
    private func loadDevicesAsync() async {
        isLoading = true
        errorMessage = nil
        
        do {
            devices = try await apiClient.fetchDevices()
        } catch APIError.unauthorized {
            AuthManager.shared.logout()
        } catch {
            errorMessage = "Failed to load devices: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    private func logout() {
        AuthManager.shared.logout()
    }
}

struct DeviceRow: View {
    let device: Device
    
    var body: some View {
        HStack(spacing: 12) {
            // Status Indicator
            Circle()
                .fill(statusColor)
                .frame(width: 10, height: 10)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(device.displayName)
                    .font(.headline)
                
                HStack(spacing: 6) {
                    Text(device.platform)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(4)
                    
                    if device.controlState.enabled {
                        Text("Control On")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.1))
                            .foregroundColor(.green)
                            .cornerRadius(4)
                    }
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private var statusColor: Color {
        if device.connected {
            return .green
        } else {
            return .gray
        }
    }
}

struct DeviceDetailView: View {
    let device: Device
    @State private var runs: [Run] = []
    @State private var isLoadingRuns = false
    
    var body: some View {
        List {
            Section("Status") {
                HStack {
                    Text("Connection")
                    Spacer()
                    HStack(spacing: 6) {
                        Circle()
                            .fill(device.connected ? Color.green : Color.gray)
                            .frame(width: 8, height: 8)
                        Text(device.connected ? "Online" : "Offline")
                            .foregroundColor(.secondary)
                    }
                }
                
                HStack {
                    Text("Paired")
                    Spacer()
                    Text(device.paired ? "Yes" : "No")
                        .foregroundColor(.secondary)
                }
                
                if let appVersion = device.appVersion {
                    HStack {
                        Text("App Version")
                        Spacer()
                        Text(appVersion)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Section("Control") {
                HStack {
                    Text("Remote Control")
                    Spacer()
                    Text(device.controlState.enabled ? "Enabled" : "Disabled")
                        .foregroundColor(device.controlState.enabled ? .green : .secondary)
                }
            }
            
            Section("Workspace") {
                HStack {
                    Text("Configured")
                    Spacer()
                    Text(device.workspaceState.configured ? "Yes" : "No")
                        .foregroundColor(.secondary)
                }
                
                if let rootName = device.workspaceState.rootName {
                    HStack {
                        Text("Root")
                        Spacer()
                        Text(rootName)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Section("Screen Stream") {
                HStack {
                    Text("Enabled")
                    Spacer()
                    Text(device.screenStreamState?.enabled == true ? "Yes" : "No")
                        .foregroundColor(.secondary)
                }
                
                if let stream = device.screenStreamState, stream.enabled {
                    HStack {
                        Text("FPS")
                        Spacer()
                        Text("\(stream.fps)")
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Section("Recent Runs") {
                if isLoadingRuns {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else if runs.isEmpty {
                    Text("No runs yet")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(runs.prefix(5)) { run in
                        NavigationLink(destination: RunDetailView(run: run)) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(run.goal ?? "Run \(run.id.prefix(8))")
                                    .font(.subheadline)
                                    .lineLimit(1)
                                
                                HStack {
                                    StatusBadge(status: run.status)
                                    Text(formatDate(run.createdAt))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    
                    if runs.count > 5 {
                        NavigationLink("View All Runs") {
                            RunsView(deviceId: device.deviceId)
                        }
                    }
                }
            }
        }
        .navigationTitle(device.displayName)
        .task {
            await loadRuns()
        }
    }
    
    private func loadRuns() async {
        isLoadingRuns = true
        do {
            runs = try await APIClient.shared.fetchRuns(deviceId: device.deviceId)
        } catch {
            // Silently fail - runs are supplementary
        }
        isLoadingRuns = false
    }
    
    private func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = RelativeDateTimeFormatter()
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(backgroundColor)
            .foregroundColor(foregroundColor)
            .cornerRadius(4)
    }
    
    private var backgroundColor: Color {
        switch status {
        case "completed": return .green.opacity(0.2)
        case "failed", "error": return .red.opacity(0.2)
        case "running", "in_progress": return .blue.opacity(0.2)
        case "pending": return .orange.opacity(0.2)
        default: return .gray.opacity(0.2)
        }
    }
    
    private var foregroundColor: Color {
        switch status {
        case "completed": return .green
        case "failed", "error": return .red
        case "running", "in_progress": return .blue
        case "pending": return .orange
        default: return .gray
        }
    }
}

struct DevicesView_Previews: PreviewProvider {
    static var previews: some View {
        DevicesView()
    }
}
