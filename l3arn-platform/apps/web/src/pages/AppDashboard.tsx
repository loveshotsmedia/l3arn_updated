import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface HealthStatus {
    status: string;
    service: string;
    version: string;
}

export default function AppDashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthStatus | null>(null);

    useEffect(() => {
        // Check auth state
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                navigate('/login');
                return;
            }
            setUserEmail(data.session.user.email ?? null);
        });

        // Fetch API health
        api.get<HealthStatus>('/health').then(setHealth).catch(console.error);
    }, [navigate]);

    async function handleSignOut() {
        await supabase.auth.signOut();
        navigate('/login');
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.logo}>L3ARN</h1>
                <div style={styles.headerRight}>
                    <span style={styles.email}>{userEmail}</span>
                    <button onClick={handleSignOut} style={styles.signOutBtn}>
                        Sign Out
                    </button>
                </div>
            </header>

            <main style={styles.main}>
                <div style={styles.card}>
                    <h2>Dashboard</h2>
                    <p style={styles.muted}>Welcome to the L3ARN platform.</p>
                </div>

                <div style={styles.card}>
                    <h3>API Status</h3>
                    {health ? (
                        <pre style={styles.pre}>{JSON.stringify(health, null, 2)}</pre>
                    ) : (
                        <p style={styles.muted}>Connecting to API...</p>
                    )}
                </div>
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { minHeight: '100vh', padding: '1.5rem' },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--color-border)',
    },
    logo: {
        fontSize: '1.5rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    email: { color: 'var(--color-text-muted)', fontSize: '0.875rem' },
    signOutBtn: {
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-text)',
        fontSize: '0.875rem',
    },
    main: { display: 'grid', gap: '1.5rem', maxWidth: '800px' },
    card: {
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
    },
    muted: { color: 'var(--color-text-muted)', marginTop: '0.5rem' },
    pre: {
        background: 'var(--color-bg)',
        padding: '1rem',
        borderRadius: 'var(--radius)',
        overflow: 'auto',
        fontSize: '0.875rem',
        marginTop: '0.5rem',
    },
};
