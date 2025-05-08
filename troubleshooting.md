# Troubleshooting: "Custom element doesn't exist: saj-h2-charge-card"

If you receive the error message "Custom element doesn't exist: saj-h2-charge-card", follow these steps to resolve it:

## 1. Check Resource Entry

Make sure you have correctly added the resource to your Lovelace configuration:

```yaml
resources:
  - url: /local/saj-h2-charge-card.js
    type: module
```

You can check and add this in Home Assistant under **Settings** > **Dashboards** > **Resources**.

## 2. Clear Browser Cache

Browser caching can sometimes cause issues:

1. Press `Ctrl+F5` (or `Cmd+Shift+R` on Mac) to reload the page with cleared cache
2. Alternatively, open Home Assistant in your browser's incognito/private mode

## 3. Restart Home Assistant

Restarting Home Assistant can help recognize new custom cards:

1. Go to **Settings** > **System** > **Restart**
2. Wait for Home Assistant to restart, then reload the page

## 4. Check File Path and Permissions

1. Make sure the file is saved under `/config/www/saj-h2-charge-card.js`
2. Verify that the file has the correct permissions (should be readable by the Home Assistant user)

## 5. Check File Name

Make sure the filename is exactly `saj-h2-charge-card.js` (case-sensitive)

## 6. Check Lovelace Mode

If you use YAML mode for Lovelace, ensure the resource is defined in your `ui-lovelace.yaml` file:

```yaml
resources:
  - url: /local/saj-h2-charge-card.js
    type: module
```

## 7. Check Console Errors

Open browser developer tools (F12 or right-click > Inspect) and check the console for error messages that might provide additional hints.

## 8. Check File Content

Make sure the file has the correct content and the component is properly defined:

```javascript
customElements.define('saj-h2-charge-card', SajH2ChargeCard);
```

This code should be at the end of the file and define the component name exactly as used in the YAML configuration.
