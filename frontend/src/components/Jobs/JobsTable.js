import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useJobs } from '../../hooks/useJobs';
import './Jobs.css';
export const JobsTable = () => {
    const { jobs, loading, fetchJobs } = useJobs();
    useEffect(() => {
        fetchJobs();
    }, []);
    if (loading)
        return _jsx("div", { className: "jobs-loading", children: "Loading jobs..." });
    return (_jsxs("div", { className: "jobs-container glass-dark", children: [_jsx("h1", { className: "jobs-title", children: "Available Jobs" }), _jsxs("div", { className: "jobs-table", children: [_jsxs("div", { className: "table-header", children: [_jsx("div", { children: "Company" }), _jsx("div", { children: "Position" }), _jsx("div", { children: "Location" }), _jsx("div", { children: "Match Score" }), _jsx("div", { children: "Action" })] }), jobs.map((job) => (_jsxs("div", { className: "table-row", children: [_jsx("div", { children: job.company_name }), _jsx("div", { children: job.title }), _jsx("div", { children: job.location }), _jsx("div", { children: _jsxs("span", { className: `match-badge match-${getMatchLevel(job.match_score)}`, children: [job.match_score || 'N/A', "%"] }) }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", children: "View" }) })] }, job.id)))] })] }));
};
function getMatchLevel(score) {
    if (score >= 90)
        return 'high';
    if (score >= 75)
        return 'medium';
    return 'low';
}
export default JobsTable;
