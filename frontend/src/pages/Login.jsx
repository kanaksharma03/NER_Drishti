import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('Authority');

  const handleLogin = (e) => {
    e.preventDefault();
    // Mocking authentication for now
    login(`mock-jwt-token-for-${selectedRole.toLowerCase()}`, selectedRole);
    navigate('/');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-base)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '2rem',
        border: '1px solid var(--border-hairline)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', textAlign: 'center' }}>
          NER-DRISHTI Access
        </h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Role</label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-base)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-hairline)',
                fontFamily: 'var(--font-body)'
              }}
            >
              <option value="Authority">Authority / Admin</option>
              <option value="Field Officer">Field Officer</option>
              <option value="Public">Public Citizen</option>
            </select>
          </div>
          
          <button 
            type="submit"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: 'var(--accent-ui)',
              color: '#000',
              border: 'none',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer'
            }}
          >
            Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
