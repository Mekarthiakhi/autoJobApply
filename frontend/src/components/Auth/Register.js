import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
export const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const { register, loading, error } = useAuth();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await register(email, password, fullName);
        if (success)
            navigate('/dashboard');
    };
    return (_jsx("div", { className: "auth-container fade-in", children: _jsxs("div", { className: "auth-form glass", children: [_jsx("h1", { className: "gradient-text slide-in-left", children: "Get Started" }), _jsx("p", { className: "auth-subtitle", children: "Create your AI job automation account" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Full Name" }), _jsx("input", { type: "text", className: "input", value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "Your Name", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", className: "input", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "your@email.com", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Password" }), _jsx("input", { type: "password", className: "input", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), error && _jsx("div", { className: "error-message", children: error }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? 'Creating account...' : 'Create Account' })] }), _jsxs("p", { className: "auth-link", children: ["Already have an account? ", _jsx("a", { href: "/login", children: "Sign in" })] })] }) }));
};
export default Register;
