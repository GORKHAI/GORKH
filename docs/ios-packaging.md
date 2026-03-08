# iOS Packaging Plan (Iteration 29)

This document outlines the technical considerations and recommended approach for bringing AI Operator to iOS.

---

## Executive Summary

**Status:** Planning phase  
**Recommendation:** Build a dedicated iOS companion app rather than porting the desktop app  
**Complexity:** High (due to iOS sandbox and automation limitations)

---

## iOS Technical Constraints

### System Automation Limitations

Unlike macOS and Windows, iOS has strict sandboxing that prevents arbitrary UI automation:

| Capability | macOS/Windows | iOS | Notes |
|------------|---------------|-----|-------|
| Screen capture (other apps) | ✅ Yes | ❌ No | iOS apps can only capture their own window |
| Input injection (other apps) | ✅ Yes | ❌ No | Cannot control apps outside your process |
| Background operation | ✅ Yes | ⚠️ Limited | Background execution heavily restricted |
| Accessibility APIs | ✅ Full | ❌ Limited | No system-wide accessibility features |
| Remote control | ✅ Yes | ❌ No | Cannot remotely control iOS device UI |

**Implication:** A direct port of the desktop "operator" functionality (screen capture + remote control) is **not technically feasible** on standard iOS.

### What IS Possible on iOS

1. **In-app screen capture** - Capture your own app's UI
2. **Push notifications** - Receive approval requests
3. **Secure enclave** - Store device tokens and API keys
4. **Biometric auth** - Face ID / Touch ID for approvals
5. **Camera / Photos** - Access with user permission
6. **Network operations** - WebSocket, REST API calls
7. **Background fetch** - Limited background data refresh

---

## Recommended Scope: iOS Companion App

Rather than a full "operator," build a **companion app** focused on:

### Phase 1: Monitoring & Approvals (MVP)

**Features:**
- View connected devices status
- Receive push notifications for approval requests
- Approve/deny actions remotely
- View run status and history
- Secure device pairing (QR code scanning)

**User Flow:**
```
1. User opens iOS app
2. Scans QR code on desktop to pair
3. Receives push notification: "Action requested: Click at (0.5, 0.3)"
4. User reviews and approves/denies
5. Desktop executes the action
```

**Value:** Users can approve actions from their phone without switching to their computer.

### Phase 2: Enhanced Monitoring

**Features:**
- View live screen preview (streamed from desktop, not captured on iOS)
- Chat interface with AI agent
- Run history and logs
- Push notifications for run completion/failures

### Phase 3: Limited Local Actions

**Features:**
- Launch specific shortcuts/apps on paired desktop
- Clipboard sync (where permitted)
- File sharing with workspace

---

## Technical Architecture Options

### Option A: Native SwiftUI (Recommended)

**Stack:**
- SwiftUI for UI
- Combine for reactive state
- URLSession for networking
- WebSocket for real-time updates
- Keychain for secure storage
- Push Notification service

**Pros:**
- Best performance and native feel
- Full access to iOS capabilities
- Strong type safety
- Easier App Store approval

**Cons:**
- Requires Swift/iOS expertise
- Separate codebase from desktop

### Option B: React Native

**Stack:**
- React Native with TypeScript
- Shared API client logic with web
- Native modules for push notifications

**Pros:**
- Code sharing with web dashboard possible
- JavaScript/TypeScript ecosystem
- Cross-platform (iOS + Android)

**Cons:**
- Performance overhead
- More complex native module integration
- Potential App Store scrutiny

### Option C: Tauri Mobile (Future)

**Stack:**
- Tauri v2 mobile support (when stable)
- Shared Rust backend with desktop
- React frontend

**Pros:**
- Maximum code sharing with desktop
- Rust backend already written

**Cons:**
- Tauri mobile is still maturing
- May hit same sandbox limitations
- Unknown App Store approval path

---

## Distribution Options

### TestFlight (Recommended for Beta)

- Up to 100 internal testers
- Up to 10,000 external testers
- Easy over-the-air updates
- No App Store review for internal

### App Store (Required for General Release)

- Full App Store review process
- Public availability
- Automatic updates
- Requires ongoing compliance

### Enterprise Distribution

- For corporate/MDM deployments
- Requires Apple Enterprise Program ($299/year)
- No App Store review
- Internal distribution only

---

## Security Considerations

### Device Token Storage

- Store in iOS Keychain (not UserDefaults)
- Use kSecAttrAccessibleWhenUnlockedThisDeviceOnly
- Implement biometric unlock for sensitive operations

### WebSocket Communication

- Certificate pinning for API connection
- End-to-end encryption for approval payloads
- Automatic reconnection with exponential backoff

### Push Notifications

- Use silent push for approval requests (no sensitive data in payload)
- Fetch details via authenticated API call when app wakes
- Implement notification actions (Approve/Deny from lock screen)

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)

1. Set up iOS project structure
2. Implement API client (shared TypeScript definitions)
3. WebSocket connection management
4. Basic device list UI
5. Authentication flow

### Phase 2: Core Features (3-4 weeks)

1. Device pairing via QR code
2. Push notification integration
3. Approval request UI
4. Approve/deny action handling
5. Local notification history

### Phase 3: Polish & Release (2-3 weeks)

1. Screen preview streaming (via desktop WebRTC)
2. Biometric authentication
3. App Store assets and screenshots
4. TestFlight beta
5. App Store submission

---

## TestFlight Distribution Guide

### Prerequisites

- Apple Developer Program membership ($99/year)
- macOS with Xcode 16.0+
- Valid signing certificate and provisioning profile

### Step-by-Step Upload Process

#### 1. Prepare the Project

```bash
cd apps/ios
open AICompanion.xcodeproj
```

In Xcode:
- Select the `AICompanion` project
- Go to **Signing & Capabilities**
- Set your **Team**
- Verify **Bundle Identifier** (e.g., `com.yourcompany.aioperator.companion`)
- Ensure **Automatically manage signing** is checked

#### 2. Archive the App

1. Select **Any iOS Device (arm64)** as the build destination
   (Not a simulator - must be generic device for archiving)
2. Go to **Product > Archive**
3. Wait for the build to complete (this may take a few minutes)

#### 3. Upload to App Store Connect

1. The Organizer window will open automatically after archiving
   (Or go to **Window > Organizer**)
2. Select the latest archive
3. Click **Distribute App**
4. Select **App Store Connect** → **Upload**
5. Click **Next** through the prompts:
   - Include bitcode: No (deprecated)
   - Upload symbols: Yes (recommended)
   - Upload app symbols: Yes
6. Review the summary and click **Upload**

#### 4. Configure in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps**
3. If first time: Click **+** → **New App**
   - Platform: iOS
   - Name: AI Operator Companion
   - Bundle ID: Your bundle identifier
   - SKU: ai-operator-companion-001
4. Fill in required metadata:
   - **App Information**: Category, description, keywords
   - **Pricing**: Free or paid
   - **App Privacy**: Privacy policy URL

#### 5. Set Up TestFlight

**Internal Testing (Immediate, up to 100 testers):**

1. Go to **TestFlight** tab in App Store Connect
2. Click **Internal Testing** > **+** next to "Testers"
3. Add team members by Apple ID or email
4. Testers receive email invitation with TestFlight link

**External Testing (Requires review, up to 10,000 testers):**

1. Go to **External Testing** in TestFlight
2. Click **+** to create a new group (e.g., "Beta Testers")
3. Add testers by email or create a public link
4. Submit for beta app review (usually 24-48 hours)

#### 6. Tester Experience

1. Tester receives email invitation
2. Opens on iOS device and taps **View in TestFlight**
3. Opens TestFlight app (or prompts to install)
4. Taps **Accept** and **Install**
5. App installs with orange dot icon (TestFlight badge)
6. Updates automatically when new builds are uploaded

### Build Versioning

For each new build:

1. Increment **Build** number (not version) in Xcode:
   - Project → General → Build: increment (e.g., 1 → 2)
2. Create new archive
3. Upload to App Store Connect
4. New build appears automatically in TestFlight

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "No signing certificate" | Check Apple Developer account status; download certificates in Xcode Preferences > Accounts |
| "Invalid bundle identifier" | Ensure unique bundle ID not used by another app |
| Upload fails with ITMS error | Check email from Apple for specific error details |
| Build not appearing | Wait 5-10 minutes; check email for processing errors |
| Testers can't install | Verify tester accepted invitation; check iOS version compatibility |

---

## Decision Table

| Question | If Yes | If No |
|----------|--------|-------|
| Do users need remote approval? | Build companion app | Not needed |
| Do users need to view desktop screen? | Stream from desktop | Skip feature |
| Do we need Android too? | Consider React Native | Use SwiftUI |
| Is team iOS-native capable? | Use SwiftUI | Consider React Native |
| Need max code sharing? | Wait for Tauri Mobile | Use SwiftUI now |

---

## Next Steps

1. ✅ **Decision:** Choose technical stack (recommend SwiftUI) - **DONE**
2. ✅ **Prototype:** Build minimal proof-of-concept (device list) - **DONE**
3. **Design:** Create iOS-specific UI mockups
4. ✅ **Planning:** Add `apps/ios` directory to monorepo - **DONE**
5. **Implementation:** Current Phase 1 - See `apps/ios/AICompanion`
6. **Timeline:** Target TestFlight beta next quarter

---

## Appendix: Why Not Full Desktop Port?

Common questions and answers:

**Q: Can we use VNC/RDP on iOS?**  
A: VNC/RDP clients exist but require a server running on the remote machine. The desktop app is not a VNC server.

**Q: What about jailbroken devices?**  
A: Not supported for production use. App Store requires non-jailbroken devices.

**Q: Can we use Screen Recording APIs?**  
A: iOS ReplayKit only records the app's own content, not other apps or system UI.

**Q: What about TestFlight-only distribution?**  
A: Still bound by same sandbox rules. TestFlight doesn't grant additional capabilities.

**Q: Could we use a web app instead?**  
A: Web apps on iOS have even more limitations than native apps (no push notifications in background, no persistent WebSocket).

---

## Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [iOS App Programming Guide](https://developer.apple.com/library/archive/documentation/iPhone/Conceptual/iPhoneOSProgrammingGuide/)
- [TestFlight Overview](https://developer.apple.com/testflight/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-07  
**Owner:** Engineering Team
