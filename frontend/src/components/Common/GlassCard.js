import { jsx as _jsx } from "react/jsx-runtime";
import './GlassCard.css';
export const GlassCard = ({ children, className = '', dark = false, onClick, }) => {
    return (_jsx("div", { className: `glass-card ${dark ? 'glass-card-dark' : ''} ${className}`, onClick: onClick, children: children }));
};
export default GlassCard;
