import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './Dashboard.css';
const StatsCard = ({ icon, label, value, trend }) => {
    return (_jsxs("div", { className: "stats-card glass", children: [_jsx("div", { className: "stats-icon", children: icon }), _jsxs("div", { className: "stats-content", children: [_jsx("div", { className: "stats-label", children: label }), _jsx("div", { className: "stats-value", children: value }), trend && _jsx("div", { className: "stats-trend", children: trend })] })] }));
};
export default StatsCard;
