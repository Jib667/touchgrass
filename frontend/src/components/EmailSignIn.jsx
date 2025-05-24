import { useState } from 'react';
import { signInWithEmail } from '../firebase';

const EmailSignIn = ({ onClose, onSuccess, onGoogleSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    // Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signInWithEmail(email, password);
      
      if (result.success) {
        // Call the onSuccess callback with the user object
        onSuccess(result.user);
      } else {
        // Handle the error from Firebase
        if (result.error.code === 'auth/user-not-found' || result.error.code === 'auth/wrong-password') {
          setError('Invalid email or password. Please try again.');
        } else if (result.error.code === 'auth/too-many-requests') {
          setError('Too many failed login attempts. Please try again later.');
        } else {
          setError(result.error.message || 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-signup">
      <h3>Sign In to Your Account</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="google-signin-container">
        <button 
          type="button"
          className="google-signin-button"
          onClick={onGoogleSignIn}
          disabled={loading}
        >
          <span className="google-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" width="14" height="14">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
            </svg>
          </span>
          Sign in with Google
        </button>
      </div>
      
      <div className="divider">
        <span>or</span>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailSignIn; 