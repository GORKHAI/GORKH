# GORKH iOS Companion

A minimal iOS companion app for GORKH that provides read-only monitoring and account access.

## Features

- **Login**: Email/password authentication with JWT stored in Keychain
- **Devices**: View your connected devices (read-only)
- **Runs**: View run history and status (read-only)
- **Secure**: JWT tokens stored in iOS Keychain with biometric protection

## Architecture

```
AICompanion/
├── App/
│   ├── AICompanionApp.swift       # App entry point
│   └── ContentView.swift          # Root navigation
├── Services/
│   ├── APIClient.swift            # REST API with Bearer auth
│   ├── KeychainManager.swift      # Secure token storage
│   └── AuthManager.swift          # Authentication state
├── Models/
│   ├── Device.swift               # Device model
│   ├── Run.swift                  # Run model
│   └── User.swift                 # User model
├── Views/
│   ├── LoginView.swift            # Login screen
│   ├── DevicesView.swift          # Device list
│   ├── DeviceDetailView.swift     # Device details
│   ├── RunsView.swift             # Run list
│   └── RunDetailView.swift        # Run details
└── Resources/
    └── Assets.xcassets/           # App icons and colors
```

## Prerequisites

- macOS 14.0+
- Xcode 16.0+
- iOS 17.0+ (deployment target)
- Apple Developer Account (for TestFlight)

## Setup

### 1. Clone and Open

```bash
cd apps/ios
open AICompanion.xcodeproj
```

### 2. Configure Signing

In Xcode:
1. Select the `AICompanion` project in the navigator
2. Select the `AICompanion` target
3. Go to **Signing & Capabilities**
4. Set your **Team** (Apple Developer account)
5. Update the **Bundle Identifier** if needed (e.g., `com.yourcompany.aioperator.companion`)

### 3. Configure API Endpoint

Edit `Services/APIClient.swift`:

```swift
// For local development
private let defaultBaseURL = URL(string: "http://localhost:3000")!

// For production
// private let defaultBaseURL = URL(string: "https://api.aioperator.com")!
```

### 4. Build and Run

1. Select a simulator or connected device
2. Press **Cmd+R** to build and run

## TestFlight Distribution

### Prerequisites

- Apple Developer Program membership ($99/year)
- App Store Connect access

### Steps

1. **Archive the App**
   - Select **Any iOS Device (arm64)** as the build target
   - Go to **Product > Archive**
   - Wait for the archive to complete

2. **Upload to App Store Connect**
   - In the Organizer window, select the archive
   - Click **Distribute App**
   - Choose **App Store Connect**
   - Select **Upload**
   - Follow the prompts (signing, etc.)

3. **Configure in App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create a new app (if first time)
   - Fill in app details (name, description, screenshots)
   - Go to **TestFlight** tab

4. **Internal Testing**
   - Add testers in **App Store Connect > Users and Access**
   - Testers receive email invitation
   - Install via TestFlight app on iOS

5. **External Testing**
   - Create a new group in TestFlight
   - Add external testers (up to 10,000)
   - Submit for beta review (usually 24-48 hours)

## Security Notes

- JWT tokens are stored in iOS Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
- Biometric authentication can be enabled for sensitive operations
- No sensitive data is logged or persisted outside Keychain
- Certificate pinning can be enabled in `APIClient.swift` for production

## Limitations

- **Read-only**: Cannot control devices (iOS sandbox limitation)
- **No screen capture**: Cannot view desktop screens (future: WebRTC streaming)
- **Background fetch**: Limited by iOS background execution policies

## License

Same as GORKH project.
