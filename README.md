# SAJ H2 Charge Card

A custom card for Home Assistant to control charging settings for SAJ H2 inverters.

## Features

- Easy setting of charge start and end time
- Slider for adjusting charging power (0-25%)
- User-friendly selection of charging days with checkboxes
- Display of the calculated daymask value
- Button to enable/disable charging
- Status display for the charging state

## Installation

1. Copy the file `saj-h2-charge-card.js` to the directory `/config/www/saj-h2-charge-card/` of your Home Assistant installation.

2. Add the resource to your Lovelace configuration:
   ```yaml
   resources:
     - url: /local/saj-h2-charge-card/saj-h2-charge-card.js
       type: module
   ```

3. Add the card to your dashboard:
   ```yaml
   type: 'custom:saj-h2-charge-card'
   title: 'SAJ H2 Charge Control'
   charge_start_entity: text.saj_charge_start_time_time
   charge_end_entity: text.saj_charge_end_time_time
   charge_day_mask_entity: number.saj_charge_day_mask_input
   charge_power_entity: number.saj_charge_power_percent_input
   charging_switch_entity: switch.saj_charging_control
   ```

## Configuration Options

| Option | Type | Required | Description |
|--------|-----|-------------|-------------|
| `title` | String | No | Title of the card (Default: "SAJ H2 Charge Control") |
| `charge_start_entity` | String | Yes | Entity ID of the charge start time (text) |
| `charge_end_entity` | String | Yes | Entity ID of the charge end time (text) |
| `charge_day_mask_entity` | String | Yes | Entity ID of the charge days mask (number) |
| `charge_power_entity` | String | Yes | Entity ID of the charging power (number) |
| `charging_switch_entity` | String | Yes | Entity ID of the charging switch (switch) |

## Example Configuration

```yaml
type: 'custom:saj-h2-charge-card'
title: 'SAJ H2 Charge Control'
charge_start_entity: text.saj_charge_start_time_time
charge_end_entity: text.saj_charge_end_time_time
charge_day_mask_entity: number.saj_charge_day_mask_input
charge_power_entity: number.saj_charge_power_percent_input
charging_switch_entity: switch.saj_charging_control
```

## Notes on Daymask

The daymask is a binary value that represents the days on which the charging process should be active:

- Monday = Bit 0 = Value 1
- Tuesday = Bit 1 = Value 2
- Wednesday = Bit 2 = Value 4
- Thursday = Bit 3 = Value 8
- Friday = Bit 4 = Value 16
- Saturday = Bit 5 = Value 32
- Sunday = Bit 6 = Value 64

The card automatically calculates this value based on the selected days.

## Troubleshooting

If the card is not displayed correctly or errors occur:

1. Check if the JavaScript file was correctly copied to the `/config/www/saj-h2-charge-card/` directory.
2. Make sure the resource was correctly added to your Lovelace configuration.
3. Check if all required entity IDs are correctly specified in the configuration.
4. Check the browser console for JavaScript errors.
