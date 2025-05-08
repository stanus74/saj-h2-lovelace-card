/**
 * SAJ H2 Discharge Card V1
 * Custom card for Home Assistant to control SAJ H2 Inverter discharging settings
 * 
 * @author Cline AI Assistant
 * @version 1.0.0
 */

class SajH2DischargeCardV1 extends HTMLElement {
  constructor() {
    super();
    this._entities = {
      // Discharge time slots
      dischargeSlots: [
        {
          startTime: 'text.saj_discharge_start_time_time',
          endTime: 'text.saj_discharge_end_time_time',
          power: 'number.saj_discharge_power_percent_input',
          dayMask: 'number.saj_discharge_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge2_start_time_time',
          endTime: 'text.saj_discharge2_end_time_time',
          power: 'number.saj_discharge2_power_percent_input',
          dayMask: 'number.saj_discharge2_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge3_start_time_time',
          endTime: 'text.saj_discharge3_end_time_time',
          power: 'number.saj_discharge3_power_percent_input',
          dayMask: 'number.saj_discharge3_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge4_start_time_time',
          endTime: 'text.saj_discharge4_end_time_time',
          power: 'number.saj_discharge4_power_percent_input',
          dayMask: 'number.saj_discharge4_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge5_start_time_time',
          endTime: 'text.saj_discharge5_end_time_time',
          power: 'number.saj_discharge5_power_percent_input',
          dayMask: 'number.saj_discharge5_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge6_start_time_time',
          endTime: 'text.saj_discharge6_end_time_time',
          power: 'number.saj_discharge6_power_percent_input',
          dayMask: 'number.saj_discharge6_day_mask_input'
        },
        {
          startTime: 'text.saj_discharge7_start_time_time',
          endTime: 'text.saj_discharge7_end_time_time',
          power: 'number.saj_discharge7_power_percent_input',
          dayMask: 'number.saj_discharge7_day_mask_input'
        }
      ],
      timeEnable: 'number.saj_discharge_time_enable_input',
      dischargingSwitch: 'switch.saj_discharging_control'
    };
    this._hass = null;
    this._debug = false; // Set to true to enable debug logging
  }

  // Card configuration
  setConfig(config) {
    // Validate required entities if provided in config
    if (config.discharge_slots) {
      this._entities.dischargeSlots = config.discharge_slots;
    }
    
    if (config.time_enable_entity) {
      this._entities.timeEnable = config.time_enable_entity;
    }
    
    if (config.discharging_switch_entity) {
      this._entities.dischargingSwitch = config.discharging_switch_entity;
    }
    
    this._initCard();
  }

  _initCard() {
    if (this._content) {
      this.removeChild(this._content);
    }
    
    // Create the card content
    this._content = document.createElement('div');
    this._content.className = 'saj-h2-discharge-card';
    this.appendChild(this._content);
    
    if (this._hass) {
      this._renderCard();
    }
  }

  // Handle updates when Home Assistant state changes
  set hass(hass) {
    this._hass = hass;
    this._renderCard();
  }

  // Render the card
  _renderCard() {
    if (!this._hass) {
      return;
    }

    // Get entity states
    const dischargingSwitchEntity = this._hass.states[this._entities.dischargingSwitch];
    const timeEnableEntity = this._hass.states[this._entities.timeEnable];
    
    // Check if main entities exist
    if (!dischargingSwitchEntity || !timeEnableEntity) {
      // Log which entities are missing for debugging
      if (this._debug) {
        console.log('SAJ H2 Discharge Card: Missing main entities:');
        if (!dischargingSwitchEntity) console.log('- Missing: ' + this._entities.dischargingSwitch);
        if (!timeEnableEntity) console.log('- Missing: ' + this._entities.timeEnable);
      }
      
      this._content.innerHTML = `
        <div class="card-error">
          <h2>Entity not found</h2>
          <p>Please check the card configuration.</p>
          <p>Missing entity: ${!dischargingSwitchEntity ? this._entities.dischargingSwitch : 
                               !timeEnableEntity ? this._entities.timeEnable : 'Unknown'}</p>
        </div>
      `;
      return;
    }

    // Get current values
    const dischargingEnabled = dischargingSwitchEntity.state === 'on';
    const timeEnableValue = parseInt(timeEnableEntity.state) || 0;
    
    // Log entity states for debugging
    if (this._debug) {
      console.log('SAJ H2 Discharge Card: Main entity states:');
      console.log('- ' + this._entities.dischargingSwitch + ': ' + dischargingSwitchEntity.state);
      console.log('- ' + this._entities.timeEnable + ': ' + timeEnableEntity.state);
    }

    // Prepare discharge slots data
    const dischargeSlots = this._entities.dischargeSlots.map((slot, index) => {
      const startTimeEntity = this._hass.states[slot.startTime];
      const endTimeEntity = this._hass.states[slot.endTime];
      const powerEntity = this._hass.states[slot.power];
      const dayMaskEntity = this._hass.states[slot.dayMask];
      
      // Check if slot entities exist
      const slotValid = startTimeEntity && endTimeEntity && powerEntity && dayMaskEntity;
      
      if (!slotValid && this._debug) {
        console.log(`SAJ H2 Discharge Card: Missing entities for slot ${index + 1}:`);
        if (!startTimeEntity) console.log('- Missing: ' + slot.startTime);
        if (!endTimeEntity) console.log('- Missing: ' + slot.endTime);
        if (!powerEntity) console.log('- Missing: ' + slot.power);
        if (!dayMaskEntity) console.log('- Missing: ' + slot.dayMask);
      }
      
      return {
        index: index,
        valid: slotValid,
        enabled: (timeEnableValue & (1 << index)) !== 0,
        startTime: slotValid ? startTimeEntity.state : '00:00',
        endTime: slotValid ? endTimeEntity.state : '00:00',
        power: slotValid ? parseInt(powerEntity.state) || 0 : 0,
        dayMask: slotValid ? parseInt(dayMaskEntity.state) || 0 : 0,
        entities: slot
      };
    });

    // Render the card content
    this._content.innerHTML = `
      <ha-card>
        <div class="card-content">
          <div class="section">
            <div class="section-header">Discharge Control</div>
            <button class="discharge-toggle-button ${dischargingEnabled ? 'active' : ''}" id="discharge-toggle">
              ${dischargingEnabled ? 'Disable Discharging' : 'Enable Discharging'}
            </button>
            <div class="discharge-status">
              Status: <span class="${dischargingEnabled ? 'active' : 'inactive'}">${dischargingEnabled ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Discharge Times</div>
            <div class="discharge-slots-table">
              ${dischargeSlots.map((slot, index) => this.renderSlot(slot, index)).join('')}
            </div>
          </div>
        </div>
      </ha-card>
    `;
    this._addEventListeners(dischargeSlots, timeEnableValue);
  }

  renderSlot(slot, index) {
    const days = this._getDaysFromMask(slot.dayMask);
    return `
      <div class="slot-row ${!slot.valid ? 'invalid' : ''}">
        <div class="time-container">
          <label class="slot-checkbox">
            <input type="checkbox" id="slot-${index}-enabled" ${slot.enabled ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />
          </label>
          <select id="slot-${index}-start-hour" class="time-select" ${!slot.valid ? 'disabled' : ''}>
            ${this._generateHourOptions(slot.startTime)}
          </select>
          <span>:</span>
          <select id="slot-${index}-start-minute" class="time-select" ${!slot.valid ? 'disabled' : ''}>
            ${this._generateMinuteOptions(slot.startTime)}
          </select>
          <span class="time-separator">-</span>
          <select id="slot-${index}-end-hour" class="time-select" ${!slot.valid ? 'disabled' : ''}>
            ${this._generateHourOptions(slot.endTime)}
          </select>
          <span>:</span>
          <select id="slot-${index}-end-minute" class="time-select" ${!slot.valid ? 'disabled' : ''}>
            ${this._generateMinuteOptions(slot.endTime)}
          </select>
          <input type="number" id="slot-${index}-power" class="power-input" min="0" max="100" step="1" value="${slot.power}" ${!slot.valid ? 'disabled' : ''} />
          <span>%</span>
        </div>
        <div class="days-container">
          <div class="days-select">
            <label><input type="checkbox" id="slot-${index}-day-mo" ${days.monday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Mo</label>
            <label><input type="checkbox" id="slot-${index}-day-tu" ${days.tuesday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Tu</label>
            <label><input type="checkbox" id="slot-${index}-day-we" ${days.wednesday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />We</label>
            <label><input type="checkbox" id="slot-${index}-day-th" ${days.thursday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Th</label>
            <label><input type="checkbox" id="slot-${index}-day-fr" ${days.friday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Fr</label>
            <label><input type="checkbox" id="slot-${index}-day-sa" ${days.saturday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Sa</label>
            <label><input type="checkbox" id="slot-${index}-day-su" ${days.sunday ? 'checked' : ''} ${!slot.valid ? 'disabled' : ''} />Su</label>
          </div>
          <div class="days-separator"></div>
        </div>
      </div>
    `;
  }

  // Add event listeners to the card elements
  _addEventListeners(dischargeSlots, timeEnableValue) {
    // Discharge toggle button
    const dischargeToggleButton = this._content.querySelector('#discharge-toggle');
    dischargeToggleButton.addEventListener('click', () => {
      // Get the switch entity
      const switchEntity = this._hass.states[this._entities.dischargingSwitch];
      
      // Check if the entity exists
      if (!switchEntity) {
        console.error('SAJ H2 Discharge Card: Switch entity not found: ' + this._entities.dischargingSwitch);
        return;
      }
      
      // Get the current state, ignoring attributes
      const currentState = switchEntity.state;
      const newState = currentState === 'on' ? 'off' : 'on';
      
      if (this._debug) {
        console.log('SAJ H2 Discharge Card: Toggling switch from ' + currentState + ' to ' + newState);
      }
      
      // Call the service to toggle the switch
      this._hass.callService('switch', 'turn_' + newState, {
        entity_id: this._entities.dischargingSwitch
      });
    });

    // Slot checkboxes
    dischargeSlots.forEach(slot => {
      if (!slot.valid) return;
      
      const slotCheckbox = this._content.querySelector(`#slot-${slot.index}-enabled`);
      slotCheckbox.addEventListener('change', () => {
        // Calculate new time enable value
        let newTimeEnableValue = timeEnableValue;
        const bitValue = 1 << slot.index;
        
        if (slotCheckbox.checked) {
          newTimeEnableValue |= bitValue; // Set bit
        } else {
          newTimeEnableValue &= ~bitValue; // Clear bit
        }
        
        if (this._debug) {
          console.log(`SAJ H2 Discharge Card: Changing slot ${slot.index + 1} enabled state to ${slotCheckbox.checked}`);
          console.log(`SAJ H2 Discharge Card: New time enable value: ${newTimeEnableValue}`);
        }
        
        // Update the time enable entity
        this._setNumberEntity(this._entities.timeEnable, newTimeEnableValue);
      });
      
      // Time inputs
      const startHour = this._content.querySelector(`#slot-${slot.index}-start-hour`);
      const startMinute = this._content.querySelector(`#slot-${slot.index}-start-minute`);
      const endHour = this._content.querySelector(`#slot-${slot.index}-end-hour`);
      const endMinute = this._content.querySelector(`#slot-${slot.index}-end-minute`);
      
      // Add event listeners for start time
      startHour.addEventListener('change', () => {
        const hour = startHour.value.padStart(2, '0');
        const minute = startMinute.value.padStart(2, '0');
        this._setTimeEntity(slot.entities.startTime, `${hour}:${minute}`);
      });
      
      startMinute.addEventListener('change', () => {
        const hour = startHour.value.padStart(2, '0');
        const minute = startMinute.value.padStart(2, '0');
        this._setTimeEntity(slot.entities.startTime, `${hour}:${minute}`);
      });
      
      // Add event listeners for end time
      endHour.addEventListener('change', () => {
        const hour = endHour.value.padStart(2, '0');
        const minute = endMinute.value.padStart(2, '0');
        this._setTimeEntity(slot.entities.endTime, `${hour}:${minute}`);
      });
      
      endMinute.addEventListener('change', () => {
        const hour = endHour.value.padStart(2, '0');
        const minute = endMinute.value.padStart(2, '0');
        this._setTimeEntity(slot.entities.endTime, `${hour}:${minute}`);
      });
      
      // Power input
      const powerInput = this._content.querySelector(`#slot-${slot.index}-power`);
      powerInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        this._setNumberEntity(slot.entities.power, value);
      });
      
      // Day checkboxes
      const dayCheckboxes = {
        mo: this._content.querySelector(`#slot-${slot.index}-day-mo`),
        tu: this._content.querySelector(`#slot-${slot.index}-day-tu`),
        we: this._content.querySelector(`#slot-${slot.index}-day-we`),
        th: this._content.querySelector(`#slot-${slot.index}-day-th`),
        fr: this._content.querySelector(`#slot-${slot.index}-day-fr`),
        sa: this._content.querySelector(`#slot-${slot.index}-day-sa`),
        su: this._content.querySelector(`#slot-${slot.index}-day-su`)
      };

      const updateDayMask = () => {
        const days = {
          monday: dayCheckboxes.mo.checked,
          tuesday: dayCheckboxes.tu.checked,
          wednesday: dayCheckboxes.we.checked,
          thursday: dayCheckboxes.th.checked,
          friday: dayCheckboxes.fr.checked,
          saturday: dayCheckboxes.sa.checked,
          sunday: dayCheckboxes.su.checked
        };
        const mask = this._calculateDaymask(days);
        this._setNumberEntity(slot.entities.dayMask, mask);
      };

      Object.values(dayCheckboxes).forEach(checkbox => {
        checkbox.addEventListener('change', updateDayMask);
      });
    });
  }

  // Calculate daymask from selected days
  _calculateDaymask(days) {
    let mask = 0;
    if (days.monday) mask += 1;
    if (days.tuesday) mask += 2;
    if (days.wednesday) mask += 4;
    if (days.thursday) mask += 8;
    if (days.friday) mask += 16;
    if (days.saturday) mask += 32;
    if (days.sunday) mask += 64;
    return mask;
  }

  // Get days from daymask
  _getDaysFromMask(mask) {
    return {
      monday: (mask & 1) !== 0,
      tuesday: (mask & 2) !== 0,
      wednesday: (mask & 4) !== 0,
      thursday: (mask & 8) !== 0,
      friday: (mask & 16) !== 0,
      saturday: (mask & 32) !== 0,
      sunday: (mask & 64) !== 0
    };
  }

  // Generate hour options (0-23)
  _generateHourOptions(timeString) {
    const hour = this._getHourFromTimeString(timeString);
    let options = '';
    
    for (let i = 0; i < 24; i++) {
      const selected = i === hour ? 'selected' : '';
      options += `<option value="${i}" ${selected}>${i}</option>`;
    }
    
    return options;
  }
  
  // Generate minute options (0-59)
  _generateMinuteOptions(timeString) {
    const minute = this._getMinuteFromTimeString(timeString);
    let options = '';
    
    for (let i = 0; i < 60; i++) {
      const selected = i === minute ? 'selected' : '';
      options += `<option value="${i}" ${selected}>${i}</option>`;
    }
    
    return options;
  }
  
  // Get hour from time string (format: HH:MM)
  _getHourFromTimeString(timeString) {
    if (!timeString || timeString.indexOf(':') === -1) {
      return 0;
    }
    
    return parseInt(timeString.split(':')[0]) || 0;
  }
  
  // Get minute from time string (format: HH:MM)
  _getMinuteFromTimeString(timeString) {
    if (!timeString || timeString.indexOf(':') === -1) {
      return 0;
    }
    
    return parseInt(timeString.split(':')[1]) || 0;
  }

  // Set time entity value
  _setTimeEntity(entityId, value) {
    try {
      this._hass.callService('text', 'set_value', {
        entity_id: entityId,
        value: value
      });
      if (this._debug) {
        console.log(`SAJ H2 Discharge Card: Set ${entityId} to ${value}`);
      }
    } catch (error) {
      console.error(`SAJ H2 Discharge Card: Error setting ${entityId} to ${value}:`, error);
    }
  }

  // Set number entity value
  _setNumberEntity(entityId, value) {
    try {
      this._hass.callService('number', 'set_value', {
        entity_id: entityId,
        value: value
      });
      if (this._debug) {
        console.log(`SAJ H2 Discharge Card: Set ${entityId} to ${value}`);
      }
    } catch (error) {
      console.error(`SAJ H2 Discharge Card: Error setting ${entityId} to ${value}:`, error);
    }
  }

  // Card styling
  getCardSize() {
    return 7;
  }

  // Load CSS directly in the card
  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    
    // Add CSS directly to the card
    const style = document.createElement('style');
    style.textContent = `
        .saj-h2-discharge-card {
          padding: 16px;
        }
        
        .card-header {
          font-size: 1.5rem;
          font-weight: 500;
          padding: 16px;
          text-align: center;
        }
        
        .card-content {
          padding: 16px;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-header {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 10px;
          color: var(--primary-color);
          display: flex;
          align-items: center;
        }
        
        /* Discharge slots */
        .discharge-slots-table {
          width: 100%;
          margin-top: 10px;
          font-size: 0.9rem;
          background: var(--card-background-color);
          border-radius: 8px;
          box-shadow: var(--ha-card-box-shadow, none);
          border: 1px solid var(--divider-color, #858585);
        }
        
        .slot-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 3px solid var(--primary-color, #03a9f4);
          margin-bottom: 0.75rem;
        }
        
        .slot-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .slot-row.invalid {
          opacity: 0.5;
          pointer-events: none;
        }
        
        /* Slot elements */
        .slot-checkbox {
          display: flex;
          align-items: center;
          cursor: pointer;
          margin-right: 8px;
        }
        
        .time-container, .power-container, .daymask-container {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        
        .time-label, .power-label, .daymask-label {
          margin-right: 4px;
        }
        
        /* Time selectors */
        .time-container {
          margin-right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .time-label {
          margin-right: 4px;
          white-space: nowrap;
        }
        
        .time-select {
          padding: 4px;
          border-radius: 4px;
          border: 1px solid var(--divider-color);
          background-color: var(--card-background-color);
          color: var(--primary-text-color);
          width: 50px;
          text-align: center;
        }
        
        /* Number inputs */
        .power-input, .daymask-input {
          width: 60px;
          padding: 4px;
          border-radius: 4px;
          border: 1px solid var(--divider-color);
          background-color: var(--card-background-color);
          color: var(--primary-text-color);
          text-align: center;
        }
        
        .power-container {
          margin-right: 8px;
        }
        
        /* Day mask dialog */
        .day-mask-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .dialog-content {
          background-color: var(--card-background-color);
          border-radius: 8px;
          padding: 16px;
          width: 80%;
          max-width: 400px;
        }
        
        .dialog-header {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 16px;
          color: var(--primary-color);
        }
        
        .days-selection {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .day-checkbox {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        
        .day-checkbox span {
          margin-top: 4px;
        }
        
        .dialog-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        
        .dialog-buttons button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        
        #dialog-cancel {
          background-color: var(--secondary-background-color);
          color: var(--primary-text-color);
        }
        
        #dialog-save {
          background-color: var(--primary-color);
          color: white;
        }
        
        /* Discharge toggle button */
        .discharge-toggle-button {
          width: 100%;
          padding: 12px;
          border-radius: 4px;
          border: none;
          background-color: var(--primary-color);
          color: white;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 10px;
        }
        
        .discharge-toggle-button.active {
          background-color: var(--error-color);
        }
        
        .discharge-status {
          text-align: center;
        }
        
        .discharge-status .active {
          color: var(--success-color);
          font-weight: 500;
        }
        
        .discharge-status .inactive {
          color: var(--error-color);
        }
        
        .card-error {
          padding: 16px;
          color: var(--error-color);
        }
        
        /* Days container and selection */
        .days-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }
        
        .days-header {
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .days-select {
          display: flex;
          gap: 0.5rem;
          flex-wrap: nowrap;
          padding-bottom: 0.5rem;
          padding-left: 2.5rem;
          width: 100%;
        }
        
        .days-separator {
          width: 100%;
          height: 2px;
          background-color: var(--divider-color, #858585);
          position: relative;
          margin-bottom: 0.75rem;
        }
        
        .days-separator:after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 1px;
          background-color: var(--primary-color, #03a9f4);
        }
        
        .days-select label {
          display: flex;
          align-items: center;
          gap: 0.15rem;
          padding: 0.15rem;
          border-radius: 3px;
          background: var(--secondary-background-color);
          font-size: 12px;
          font-weight: normal;
          color: var(--primary-text-color);
        }
      `;
    this.appendChild(style);
  }
}

// Register the element with a new name
customElements.define('saj-h2-discharge-card-v1', SajH2DischargeCardV1);

// Add the card to the custom cards list
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'saj-h2-discharge-card-v1',
  name: 'SAJ H2 Discharge Card V1',
  description: 'Card for controlling discharge settings for SAJ H2 inverters'
});
