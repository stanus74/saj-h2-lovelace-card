# Installation of the SAJ H2 Charge Card

This guide describes how to set up the SAJ H2 Charge Card in your Home Assistant installation.

## Prerequisites

- Home Assistant with the SAJ H2 Modbus Integration
- Access to the file system of Home Assistant

## Installation Steps

### 1. Copy Files

Copy the following files to the directory `/config/www/saj-h2-charge-card/` of your Home Assistant installation:

- `saj-h2-charge-card.js`
- `saj-h2-charge-card.css`

You can do this via the Samba share, SSH, or the file editor in Home Assistant.

### 2. Add Resource to Lovelace

Add the JavaScript file as a resource in your Lovelace configuration:

1. Go to **Configuration** > **Lovelace Dashboards** > **Resources**
2. Click **Add Resource**
3. Enter the following information:
   - URL: `/local/saj-h2-charge-card/saj-h2-charge-card.js`
   - Resource Type: `JavaScript Module`
4. Click **Create**

### 3. Add Card to Dashboard

Add the card to your dashboard:

1. Go to your dashboard
2. Click **Edit**
3. Click **+ Add Card**
4. Select **Custom: SAJ H2 Charge Card**
5. Configure the card with the appropriate entities:

```yaml
type: 'custom:saj-h2-charge-card'
title: 'SAJ H2 Charge Control'
charge_start_entity: text.saj_charge_start_time_time
charge_end_entity: text.saj_charge_end_time_time
charge_day_mask_entity: number.saj_charge_day_mask_input
charge_power_entity: number.saj_charge_power_percent_input
charging_switch_entity: switch.saj_charging_control
```

6. Click **Save**

## Usage

The card offers the following functions:

- Setting the charge start and end time
- Setting the charging power (0-25%)
- Selection of charging days via checkboxes
- Activation/deactivation of charging

All changes are automatically transmitted to the SAJ H2 Modbus Integration.

## Troubleshooting

If the card is not displayed correctly:

1. Check the browser console for JavaScript errors
2. Make sure the resource is loaded correctly
3. Check if the specified entities exist and are correct
