import SwiftUI

struct RunsView: View {
    var deviceId: String? = nil
    
    @StateObject private var apiClient = APIClient.shared
    @State private var runs: [Run] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        List {
            if runs.isEmpty && !isLoading {
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "play.circle")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        
                        Text("No Runs")
                            .font(.headline)
                        
                        Text("Start a run from your desktop to see it here.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                }
            }
            
            Section {
                ForEach(runs) { run in
                    NavigationLink(destination: RunDetailView(run: run)) {
                        RunRow(run: run)
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
        .navigationTitle(deviceId == nil ? "All Runs" : "Device Runs")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: loadRuns) {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isLoading)
            }
        }
        .refreshable {
            await loadRunsAsync()
        }
        .onAppear {
            loadRuns()
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
    }
    
    private func loadRuns() {
        Task {
            await loadRunsAsync()
        }
    }
    
    private func loadRunsAsync() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let deviceId = deviceId {
                runs = try await apiClient.fetchRuns(deviceId: deviceId)
            } else {
                runs = try await apiClient.fetchRuns()
            }
        } catch APIError.unauthorized {
            AuthManager.shared.logout()
        } catch {
            errorMessage = "Failed to load runs: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
}

struct RunRow: View {
    let run: Run
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(run.goal ?? "Run \(run.id.prefix(8))")
                    .font(.headline)
                    .lineLimit(1)
                
                Spacer()
                
                StatusBadge(status: run.status)
            }
            
            HStack(spacing: 12) {
                Label(formatDate(run.createdAt), systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if run.isActive {
                    ProgressView()
                        .scaleEffect(0.6)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = RelativeDateTimeFormatter()
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct RunDetailView: View {
    let run: Run
    @State private var fullRun: Run?
    @State private var isLoading = false
    
    var body: some View {
        List {
            Section("Overview") {
                HStack {
                    Text("Status")
                    Spacer()
                    StatusBadge(status: run.status)
                }
                
                HStack {
                    Text("Mode")
                    Spacer()
                    Text(run.mode ?? "Default")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Created")
                    Spacer()
                    Text(formatDate(run.createdAt))
                        .foregroundColor(.secondary)
                }
                
                if let completedAt = run.completedAt {
                    HStack {
                        Text("Completed")
                        Spacer()
                        Text(formatDate(completedAt))
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            if let goal = run.goal {
                Section("Goal") {
                    Text(goal)
                        .font(.body)
                }
            }
            
            if let error = run.error {
                Section("Error") {
                    Text(error)
                        .font(.body)
                        .foregroundColor(.red)
                }
            }
            
            Section("Steps") {
                let steps = fullRun?.steps ?? run.steps ?? []
                
                if steps.isEmpty {
                    if isLoading {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else {
                        Text("No steps recorded")
                            .foregroundColor(.secondary)
                    }
                } else {
                    ForEach(steps) { step in
                        StepRow(step: step)
                    }
                }
            }
        }
        .navigationTitle("Run Details")
        .task {
            await loadFullRun()
        }
    }
    
    private func loadFullRun() async {
        isLoading = true
        do {
            fullRun = try await APIClient.shared.fetchRun(runId: run.id)
        } catch {
            // Keep using the partial data
        }
        isLoading = false
    }
    
    private func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct StepRow: View {
    let step: RunStep
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Step status indicator
            ZStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
            }
            .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(step.type.capitalized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text(step.status.capitalized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let content = step.content {
                    Text(content)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                if let error = step.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var statusColor: Color {
        switch step.status {
        case "completed": return .green
        case "failed", "error": return .red
        case "running", "in_progress": return .blue
        case "pending": return .orange
        default: return .gray
        }
    }
}

struct RunsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            RunsView()
        }
    }
}
