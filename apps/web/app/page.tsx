import {
  Activity,
  ArrowRight,
  Brain,
  Cpu,
  Download,
  Eye,
  HardDrive,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { GorkhLogo } from '../components/brand';
import { Card } from '../components/ui';

export default function Home() {
  return (
    <main className="page">
      {/* HERO */}
      <section className="hero hero--center">
        <div className="eyebrow">
          <Activity size={14} />
          Now available
        </div>

        <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
          <GorkhLogo />
          <p
            className="mono"
            style={{
              margin: 0,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              fontSize: 12,
            }}
          >
            Desktop-Native AI Agent
          </p>
        </div>

        <h1 className="hero__title">
          AI That Controls
          <br />
          Your Mac
        </h1>
        <p className="hero__subtitle">
          GORKH is a desktop-native AI agent that sees your screen, understands your workflow, and
          takes action — with your explicit approval every step of the way. Built for macOS.
          Privacy-first. Investor-ready.
        </p>

        <div className="hero__actions">
          <Link href="/download">
            <span className="button">
              <Download size={16} />
              Download for macOS
            </span>
          </Link>
          <Link href="/login">
            <span className="button button--secondary">
              <Terminal size={16} />
              Investor Dashboard
            </span>
          </Link>
        </div>
      </section>

      {/* PROBLEM + SOLUTION */}
      <section style={{ marginTop: 96 }}>
        <div className="grid grid--3">
          <Card>
            <Eye size={20} />
            <h2 className="section-heading" style={{ fontSize: 20, marginTop: 18 }}>
              The Problem
            </h2>
            <p className="copy" style={{ marginTop: 12 }}>
              Today's AI assistants live in the cloud. They cannot see your desktop, access your
              files, or interact with your apps. Every task requires manual copy-paste between
              browser tabs and native software. The context stays fragmented.
            </p>
          </Card>
          <Card>
            <Zap size={20} />
            <h2 className="section-heading" style={{ fontSize: 20, marginTop: 18 }}>
              The Shift
            </h2>
            <p className="copy" style={{ marginTop: 12 }}>
              The next generation of AI runs on-device. It sees what you see, operates your
              software, and keeps your data local. This is not a chatbot. It is an operator that
              works inside your existing toolchain.
            </p>
          </Card>
          <Card>
            <Sparkles size={20} />
            <h2 className="section-heading" style={{ fontSize: 20, marginTop: 18 }}>
              The Product
            </h2>
            <p className="copy" style={{ marginTop: 12 }}>
              GORKH is a macOS app built with Tauri 2 and Rust. It captures your screen, interprets
              UI state with vision models, plans multi-step actions, and executes them through
              clicks, typing, and system tools — only after you approve each step.
            </p>
          </Card>
        </div>
      </section>

      {/* TECHNOLOGY STACK */}
      <section style={{ marginTop: 96 }}>
        <p className="section-title">Technology</p>
        <h2 className="section-heading" style={{ marginBottom: 36 }}>
          Built for Performance &amp; Trust
        </h2>
        <div className="grid grid--3">
          <Card hover>
            <Cpu size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Rust Core
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              The agent runtime is written in Rust for memory safety and native performance. Screen
              capture, input simulation, and file operations run at OS speed without JavaScript
              overhead.
            </p>
          </Card>
          <Card hover>
            <Brain size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Multi-Provider AI
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              Supports OpenAI, Anthropic Claude, DeepSeek, and Moonshot (Kimi) with intelligent
              fallback routing. Users bring their own API keys — stored in the macOS Keychain, never
              on our servers.
            </p>
          </Card>
          <Card hover>
            <HardDrive size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Local-First
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              GORKH Free hosted tier with 5 jobs/day. Screen data
              is never persisted or transmitted. Ephemeral 60-second memory with zero cloud
              dependency for core workflows.
            </p>
          </Card>
          <Card hover>
            <Shield size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Approval-First Design
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              Every sensitive action — clicks, file deletions, terminal commands — triggers an
              explicit approval dialog. The agent cannot execute destructive operations without human
              consent. Safety is architectural, not optional.
            </p>
          </Card>
          <Card hover>
            <Lock size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Enterprise Security
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              API keys live in the macOS Keychain. No server-side LLM keys. No data persistence.
              Screen captures are in-memory only. The architecture is designed for SOC 2 and
              enterprise compliance from day one.
            </p>
          </Card>
          <Card hover>
            <Layers size={20} />
            <h3 className="section-heading" style={{ fontSize: 18, marginTop: 16 }}>
              Extensible Tools
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              Built-in tool registry covers filesystem operations, terminal execution, clipboard
              management, app launching, and system actions (empty trash, etc.). New tools are
              registered with JSON schema and risk classification.
            </p>
          </Card>
        </div>
      </section>

      {/* BUSINESS MODEL */}
      <section style={{ marginTop: 96 }}>
        <p className="section-title">Business Model</p>
        <h2 className="section-heading" style={{ marginBottom: 36 }}>
          Freemium with Premium Cloud
        </h2>
        <div className="grid grid--3">
          <Card>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--success)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Free Tier
            </div>
            <h3 className="section-heading" style={{ fontSize: 20, marginTop: 12 }}>
              BYO Provider
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              Full desktop agent with screen understanding, file tools, and terminal access.
              Use your own API keys for OpenAI, Claude, DeepSeek, Kimi, MiniMax, or compatible providers.
              No account required. Unlimited usage with your own keys.
            </p>
          </Card>
          <Card>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--warning)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Pro Tier
            </div>
            <h3 className="section-heading" style={{ fontSize: 20, marginTop: 12 }}>
              Cloud Surfaces
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              Web dashboard for remote device management, run history, team billing, and
              cross-device task orchestration. Subscription unlocks multi-desktop fleets and
              advanced automation.
            </p>
          </Card>
          <Card>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--accent)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Enterprise
            </div>
            <h3 className="section-heading" style={{ fontSize: 20, marginTop: 12 }}>
              Team Deployment
            </h3>
            <p className="copy" style={{ marginTop: 10 }}>
              SSO, audit logs, centralized policy management, and private model endpoints. Built for
              teams that need compliance, oversight, and scalable AI operations across their Mac
              fleet.
            </p>
          </Card>
        </div>
      </section>

      {/* MARKET & TRACTION */}
      <section style={{ marginTop: 96 }}>
        <p className="section-title">Market &amp; Traction</p>
        <h2 className="section-heading" style={{ marginBottom: 36 }}>
          Why Now
        </h2>
        <div className="grid grid--3">
          <Card>
            <h3 className="section-heading" style={{ fontSize: 20 }}>The macOS Opportunity</h3>
            <p className="copy" style={{ marginTop: 12 }}>
              macOS holds 15% of the global desktop market and over 50% of the developer and
              creative professional segments. These are high-value users who pay for productivity
              tools. GORKH targets this exact demographic first.
            </p>
          </Card>
          <Card>
            <h3 className="section-heading" style={{ fontSize: 20 }}>Agentic AI Wave</h3>
            <p className="copy" style={{ marginTop: 12 }}>
              2025-2026 is the inflection point for AI agents that take action. Chat is saturated.
              The next frontier is systems that operate software on behalf of users. GORKH is
              positioned at the intersection of hosted AI and desktop automation.
            </p>
          </Card>
          <Card>
            <h3 className="section-heading" style={{ fontSize: 20 }}>Current Status</h3>
            <p className="copy" style={{ marginTop: 12 }}>
              Working macOS builds (Apple Silicon + Intel), signed and notarized.
              Multi-provider LLM routing, cost tracking, retry logic, and tool registry are
              production-ready. Cloud backend (Fastify/PostgreSQL) and web dashboard operational.
            </p>
          </Card>
        </div>
      </section>

      {/* SECURITY PROMISE */}
      <section style={{ marginTop: 96 }}>
        <Card style={{ borderColor: 'rgba(52, 211, 153, 0.22)', background: 'rgba(16, 185, 129, 0.04)' }}>
          <div className="split" style={{ alignItems: 'center' }}>
            <div>
              <h2 className="section-heading" style={{ fontSize: 24 }}>
                Privacy Is Not a Feature. It Is the Foundation.
              </h2>
              <p className="copy" style={{ marginTop: 12, maxWidth: 640 }}>
                Your API keys never leave your machine. Your screen data is never stored. Your
                files are never uploaded. GORKH is designed so that even a complete server
                compromise would expose zero user data — because we do not have it.
              </p>
            </div>
            <Shield size={48} style={{ color: 'var(--success)', opacity: 0.6, minWidth: 48 }} />
          </div>
        </Card>
      </section>

      {/* FINAL CTA */}
      <section className="hero hero--center" style={{ marginTop: 96 }}>
        <h2 className="section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
          Experience the Future of Desktop AI
        </h2>
        <p className="hero__subtitle" style={{ maxWidth: 560 }}>
          Download the macOS app today. See how GORKH understands your workflow and accelerates
          your work — without ever compromising your privacy.
        </p>
        <div className="hero__actions">
          <Link href="/download">
            <span className="button">
              <Download size={16} />
              Download for macOS
            </span>
          </Link>
          <a href="mailto:investors@gorkh.ai">
            <span className="button button--secondary">
              Contact Investors
              <ArrowRight size={16} />
            </span>
          </a>
        </div>
      </section>
    </main>
  );
}
