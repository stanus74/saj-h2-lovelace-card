# Adding a Resource in Lovelace

This guide explains how to add a custom JavaScript resource to your Lovelace configuration in Home Assistant.

## Method 1: Via the User Interface (recommended)

1. Open Home Assistant in your browser
2. Click on **Configuration** in the sidebar (gear icon)
3. Select **Lovelace Dashboards**
4. Click on the **Resources** tab
5. Click on the **+ ADD RESOURCE** button in the bottom right corner
6. Enter the following information:
   - URL: `/local/saj-h2-charge-card/saj-h2-charge-card.js`
   - Resource Type: `JavaScript Module`
7. Click **CREATE**
8. Reload the page to apply the changes

## Method 2: Via the Configuration File

If you use Lovelace in YAML mode, you can add the resource in your `ui-lovelace.yaml` file:

1. Open your `ui-lovelace.yaml` file
2. Add the resource in the `resources` section:

```yaml
resources:
  - url: /local/saj-h2-charge-card/saj-h2-charge-card.js
    type: module
```

3. Save the file
4. Reload Home Assistant to apply the changes

## Method 3: Via the Resources File

If you have multiple dashboards, you can add the resource in the `lovelace-resources.yaml` file:

1. Create or open the file `.storage/lovelace_resources` in your Home Assistant configuration directory
2. Add the resource:

```json
{
  "data": {
    "items": [
      {
        "id": "saj_h2_charge_card",
        "type": "module",
        "url": "/local/saj-h2-charge-card/saj-h2-charge-card.js"
      }
    ]
  },
  "key": "lovelace_resources",
  "version": 1
}
```

3. Save the file
4. Restart Home Assistant to apply the changes

## Verifying the Installation

After adding the resource, you should be able to add the custom card to your dashboard:

1. Go to a dashboard
2. Click **Edit**
3. Click **+ Add Card**
4. Scroll down to **Custom**
5. Select **SAJ H2 Charge Card**

If the card does not appear in the list, check if the resource was added correctly and reload the page.
