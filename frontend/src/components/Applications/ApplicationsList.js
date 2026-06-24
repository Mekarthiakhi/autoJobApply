import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { applicationsAPI } from '../../api/auth';
import './Applications.css';
export const ApplicationsList = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await applicationsAPI.getApplications();
                setApplications(response.data);
            }
            catch (error) {
                console.error('Failed to fetch applications', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);
    if (loading)
        return _jsx("div", { className: "apps-loading", children: "Loading applications..." });
    const stats = {
        applied: applications.filter((a) => a.status === 'applied').length,
        interviews: applications.filter((a) => a.interview_scheduled).length,
        rejected: applications.filter((a) => a.rejected).length,
        offers: applications.filter((a) => a.offer_received).length,
    };
    return (_jsxs("div", { className: "applications-container glass-dark fade-in", children: [_jsx("h1", { className: "apps-title slide-in-left", children: "My Applications" }), _jsxs("div", { className: "apps-stats slide-in-right", children: [_jsxs("div", { className: "stat-item glass", children: [_jsx("span", { className: "stat-label", children: "Applied" }), _jsx("span", { className: "stat-value", children: stats.applied })] }), _jsxs("div", { className: "stat-item glass", children: [_jsx("span", { className: "stat-label", children: "Interviews" }), _jsx("span", { className: "stat-value", children: stats.interviews })] }), _jsxs("div", { className: "stat-item glass", children: [_jsx("span", { className: "stat-label", children: "Rejected" }), _jsx("span", { className: "stat-value", children: stats.rejected })] }), _jsxs("div", { className: "stat-item glass", children: [_jsx("span", { className: "stat-label", children: "Offers" }), _jsx("span", { className: "stat-value", children: stats.offers })] })] }), _jsx("div", { className: "applications-list", children: applications.map((app) => (_jsxs("div", { className: "app-card glass", children: [_jsxs("div", { className: "app-header", children: [_jsx("h3", { children: app.job_title || 'Job Title' }), _jsx("span", { className: `status-badge status-${app.status}`, children: app.status })] }), _jsxs("div", { className: "app-details", children: [_jsxs("p", { children: [_jsx("strong", { children: "Company:" }), " ", app.company_name || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Applied:" }), " ", new Date(app.applied_at).toLocaleDateString()] })] }), _jsx("div", { className: "app-actions", children: _jsx("button", { className: "btn btn-secondary", children: "Update Status" }) })] }, app.id))) })] }));
};
export default ApplicationsList;
