import Link from 'next/link';

export default function Download() {
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
        ← Back to Home
      </Link>
      
      <h1 style={{ marginTop: '1rem' }}>Download AI Operator</h1>
      <p>Install the desktop app to enable remote control capabilities.</p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          disabled
        >
          Download macOS
        </button>
        
        <button
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          disabled
        >
          Download Windows
        </button>
      </div>
      
      <p style={{ marginTop: '2rem', color: '#666' }}>
        Coming soon. Build from source in apps/desktop for now.
      </p>
    </main>
  );
}
