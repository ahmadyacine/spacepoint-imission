# Exhibition Mode Implementation Suggestion

This document outlines how to implement a dedicated "Exhibition Mode" for the Cube-Sat Ground Station. This mode allows for quick, unrestricted access to the platform without requiring a login from the Madar Hub.

## 1. UI Changes

### `index.html`
Add a hidden button to the login portal that only appears when a secret URL parameter is present.

```html
<!-- Inside the <div class="login-card">, after the Guest button -->
<button type="button" id="exhibition-entry" class="btn-guest hidden" 
  style="margin-top:10px; background:rgba(0,210,255,0.15); border-color:#00d2ff; color:#00d2ff; border-style:dashed;">
  🚀 Launch Exhibition Mode
</button>
```

### `src/modules/ui.js`
Add logic to the `initLogin` function to detect the URL parameter and handle the bypass.

```javascript
// In initLogin function
const exhibitionBtn = document.getElementById('exhibition-entry');
const urlParams = new URLSearchParams(window.location.search);

// Show button only if ?exhibition=true is in the URL
if (urlParams.get('exhibition') === 'true' && exhibitionBtn) {
    exhibitionBtn.classList.remove('hidden');
}

if (exhibitionBtn) {
    exhibitionBtn.addEventListener('click', () => {
        // Bypass login and grant full admin permissions
        enterDashboard({ 
            username: 'Exhibition Mode', 
            role: 'admin', 
            is_super: true,
            permissions: {
                'cdhs-telemetry': true,
                'adcs-telemetry': true,
                'lora-dashboard': true
            } 
        });
        window.showNotification('Exhibition Mode Active', 'Full system access granted.', 'success');
    });
}
```

## 2. Usage Instructions

To enter the platform in Exhibition Mode:
1. Open the Ground Station URL in your browser.
2. Append `?exhibition=true` to the end of the URL.
   - Example: `http://localhost:5173/?exhibition=true`
3. Click the blue **Launch Exhibition Mode** button that appears.

This will grant you full access to all telemetry data and the Command Center without needing to log in via Madar.
