import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;
                navigate('/onboarding');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                navigate('/app');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>L3ARN</h1>
                <p style={styles.subtitle}>
                    {isSignUp ? 'Create your account' : 'Sign in to your account'}
                </p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                    />

                    {error && <p style={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Loading…' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <p style={styles.toggle}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button onClick={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
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
        maxWidth: '400px',
    },
    title: {
        fontSize: '2rem',
        fontWeight: 700,
        textAlign: 'center' as const,
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        textAlign: 'center' as const,
        color: 'var(--color-text-muted)',
        marginTop: '0.5rem',
        marginBottom: '1.5rem',
    },
    form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
    input: {
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontSize: '1rem',
    },
    button: {
        padding: '0.75rem',
        borderRadius: 'var(--radius)',
        border: 'none',
        background: 'var(--color-primary)',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 600,
        transition: 'background 0.2s',
    },
    error: { color: '#f87171', fontSize: '0.875rem' },
    toggle: { textAlign: 'center' as const, marginTop: '1rem', color: 'var(--color-text-muted)' },
    toggleBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--color-primary)',
        fontWeight: 600,
    },
};
