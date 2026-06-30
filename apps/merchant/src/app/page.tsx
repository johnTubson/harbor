import { HARBOR_VERSION } from '@harbor/shared';

export default function HomePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 720 }}>
      <h1>Harbor Merchant</h1>
      <p>Merchant portal — products, orders, payout summary.</p>
      <p>
        <strong>Version:</strong> {HARBOR_VERSION}
      </p>
      <p>
        <strong>API:</strong>{' '}
        <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
          {apiUrl}/docs
        </a>
      </p>
      <p style={{ color: '#666', marginTop: '2rem' }}>
        Phase 4: Product CRUD and order management UI.
      </p>
    </main>
  );
}
