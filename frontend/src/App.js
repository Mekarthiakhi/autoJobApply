import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import JobsTable from './components/Jobs/JobsTable';
import ApplicationsList from './components/Applications/ApplicationsList';
import Settings from './components/Settings/Settings';
import Layout from './components/Common/Layout';
import './styles/globals.css';
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? (_jsx(Layout, { children: children })) : (_jsx(Navigate, { to: "/login" }));
};
function App() {
    const { isAuthenticated } = useAuth();
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/jobs", element: _jsx(ProtectedRoute, { children: _jsx(JobsTable, {}) }) }), _jsx(Route, { path: "/applications", element: _jsx(ProtectedRoute, { children: _jsx(ApplicationsList, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: isAuthenticated ? "/dashboard" : "/login" }) })] }) }));
}
export default App;
