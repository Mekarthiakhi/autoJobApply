import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';
const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const links = [
        { to: '/dashboard', label: '📊 Dashboard' },
        { to: '/jobs', label: '🔍 Jobs' },
        { to: '/applications', label: '📝 Applications' },
        { to: '/settings', label: '⚙️ Settings' },
    ];
    return (_jsxs("nav", { className: "navbar", children: [_jsx(Link, { to: "/dashboard", className: "navbar-brand", children: "\uD83D\uDE80 AI Job Automation" }), _jsxs("div", { className: "navbar-links", children: [links.map((link) => (_jsx(Link, { to: link.to, className: `nav-link ${location.pathname === link.to ? 'active' : ''}`, children: link.label }, link.to))), _jsx("button", { className: "nav-logout", onClick: handleLogout, children: "Logout" })] })] }));
};
export default Navbar;
