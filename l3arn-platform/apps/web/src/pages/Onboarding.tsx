import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Welcome to L3ARN</h1>
                <p style={styles.subtitle}>Let's set up your account.</p>

                <div style={styles.steps}>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>1</div>
                        <div>
                            <h3>Complete Your Profile</h3>
                            <p style={styles.muted}>Tell us about yourself and your role.</p>
                        </div>
                    </div>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>2</div>
                        <div>
                            <h3>Set Up Your Workspace</h3>
                            <p style={styles.muted}>Create or join a tenant organization.</p>
                        </div>
                    </div>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>3</div>
                        <div>
                            <h3>Add Students</h3>
                            <p style={styles.muted}>Register learners and set initial preferences.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/app')}
                    style={styles.button}
                >
                    Get Started →
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    card: {
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '500px',
    },
    title: { fontSize: '1.75rem', fontWeight: 700 },
    subtitle: { color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: '2rem' },
    steps: { display: 'flex', flexDirection: 'column' as const, gap: '1.25rem', marginBottom: '2rem' },
    step: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
    stepNumber: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'var(--color-primary)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.875rem',
        flexShrink: 0,
    },
    muted: { color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' },
    button: {
        width: '100%',
        padding: '0.75rem',
        borderRadius: 'var(--radius)',
        border: 'none',
        background: 'var(--color-primary)',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 600,
    },
};
