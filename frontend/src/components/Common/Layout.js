import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from './Navbar';
import './Navbar.css';
const Layout = ({ children }) => {
    return (_jsxs("div", { className: "layout", children: [_jsx(Navbar, {}), _jsx("main", { className: "layout-content", children: children })] }));
};
export default Layout;
