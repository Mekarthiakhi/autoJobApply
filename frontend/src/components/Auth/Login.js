import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error } = useAuth();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success)
            navigate('/dashboard');
    };
    return (_jsx("div", { className: "auth-container fade-in", children: _jsxs("div", { className: "auth-form glass", children: [_jsx("h1", { className: "gradient-text slide-in-right", children: "Welcome Back" }), _jsx("p", { className: "auth-subtitle", children: "Sign in to your account" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", className: "input", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "your@email.com", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Password" }), _jsx("input", { type: "password", className: "input", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), error && _jsx("div", { className: "error-message", children: error }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? 'Signing in...' : 'Sign In' })] }), _jsxs("p", { className: "auth-link", children: ["Don't have an account? ", _jsx("a", { href: "/register", children: "Create one" })] })] }) }));
};
export default Login;
