import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/auth';
import StatsCard from './StatsCard';
import './Dashboard.css';
export const Dashboard = () => {
    const [stats, setStats] = useState({
        totalJobsFound: 0,
        totalApplications: 0,
        totalMatches: 0,
        successRate: 0,
        interviews: 0,
        offers: 0,
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await dashboardAPI.getDashboard();
                setStats(response.data.stats);
            }
            catch (error) {
                console.error('Failed to fetch dashboard', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);
    if (loading)
        return _jsx("div", { className: "dashboard-loading", children: "Loading..." });
    return (_jsxs("div", { className: "dashboard glass-dark fade-in", children: [_jsx("h1", { className: "dashboard-title slide-in-left", children: "Dashboard" }), _jsxs("div", { className: "stats-grid", children: [_jsx(StatsCard, { icon: "\uD83D\uDD0D", label: "Jobs Found", value: stats.totalJobsFound, trend: "\u2191" }), _jsx(StatsCard, { icon: "\u2728", label: "Total Matches", value: stats.totalMatches, trend: "\u2191" }), _jsx(StatsCard, { icon: "\uD83D\uDCDD", label: "Applications", value: stats.totalApplications, trend: "\u2192" }), _jsx(StatsCard, { icon: "\uD83C\uDFAF", label: "Success Rate", value: `${stats.successRate}%`, trend: "\u2191" }), _jsx(StatsCard, { icon: "\uD83D\uDCC5", label: "Interviews", value: stats.interviews, trend: "\u2191" }), _jsx(StatsCard, { icon: "\uD83C\uDF89", label: "Offers", value: stats.offers, trend: "\u2191" })] })] }));
};
export default Dashboard;
