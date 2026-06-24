import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth';
import './Settings.css';
export const Settings = () => {
    // const { user } = useAuth(); // removed unused
    const [preferredLocations, setPreferredLocations] = useState(['Remote', 'Hyderabad', 'Bangalore']);
    const [minMatchScore, setMinMatchScore] = useState(80);
    const [telegramEnabled, setTelegramEnabled] = useState(false);
    const [telegramChatId, setTelegramChatId] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccessMessage('');
            setErrorMessage('');
            await authAPI.updateProfile({
                preferredLocations,
                minMatchScore,
                employmentType: 'Full-Time',
            });
            setSuccessMessage('Settings saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
        catch (error) {
            setErrorMessage(error.response?.data?.error || 'Failed to save settings. Make sure the backend is running.');
            setTimeout(() => setErrorMessage(''), 5000);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "settings-container glass-dark", children: [_jsx("h1", { className: "settings-title", children: "Settings" }), successMessage && _jsx("div", { className: "success-message", children: successMessage }), errorMessage && _jsx("div", { className: "error-message", children: errorMessage }), _jsxs("div", { className: "settings-sections", children: [_jsxs("div", { className: "settings-section glass", children: [_jsx("h2", { children: "Job Preferences" }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Minimum Match Score" }), _jsxs("div", { className: "range-input", children: [_jsx("input", { type: "range", min: "0", max: "100", value: minMatchScore, onChange: (e) => setMinMatchScore(parseInt(e.target.value)), className: "range-slider" }), _jsxs("span", { className: "range-value", children: [minMatchScore, "%"] })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Preferred Locations" }), _jsx("div", { className: "locations-list", children: preferredLocations.map((location) => (_jsxs("div", { className: "location-tag", children: [location, _jsx("button", { type: "button", onClick: () => setPreferredLocations(preferredLocations.filter((l) => l !== location)), children: "\u00D7" })] }, location))) })] })] }), _jsxs("div", { className: "settings-section glass", children: [_jsx("h2", { children: "Notifications" }), _jsx("div", { className: "toggle-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: telegramEnabled, onChange: (e) => setTelegramEnabled(e.target.checked) }), _jsx("span", { children: "Enable Telegram Notifications" })] }) }), telegramEnabled && (_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Telegram Chat ID" }), _jsx("input", { type: "text", className: "input", value: telegramChatId, onChange: (e) => setTelegramChatId(e.target.value), placeholder: "Your Telegram Chat ID" })] }))] }), _jsxs("div", { className: "settings-section glass", children: [_jsx("h2", { children: "Resume" }), _jsxs("div", { className: "file-upload", children: [_jsx("input", { type: "file", accept: ".pdf,.doc,.docx" }), _jsx("p", { children: "Upload your resume for AI matching" })] })] })] }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving, children: saving ? 'Saving...' : 'Save Settings' })] }));
};
export default Settings;
