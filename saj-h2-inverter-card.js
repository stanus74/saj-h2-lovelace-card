/**
 * SAJ H2 Inverter Card
 * Custom card for Home Assistant to control SAJ H2 Inverter charging and discharging settings
 * 
 * @author Cline AI Assistant
 * @version 1.0.0
 */

class SajH2InverterCard extends HTMLElement {
  constructor() {
    super();
    this._entities = {
      // Charging entities
      chargeStart: null,
      chargeEnd: null,
      chargeDayMask: null,
      chargePower: null,
      chargingSwitch: null,
      
      // Discharging entities
      dischargeSlots: [],
      timeEnable: null,
      dischargingSwitch: null
    };
    this._mode = 'both'; // Default mode: both charging and discharging
    this._hass = null;
    this._debug = false;
  }

  // Card configuration
  setConfig(config) {
    // Set mode
    this._mode = config.mode || 'both';
    
    if (!['charge', 'discharge', 'both'].includes(this._mode)) {
      throw new Error('Invalid mode. Must be one of: charge, discharge, both');
    }
    
    // Validate required entities based on mode
    if (this._mode === 'charge' || this._mode === 'both') {
      if (!config.charge_start_entity || !config.charge_end_entity ||
          !config.charge_day_mask_entity || !config.charge_power_entity ||
          !config.charging_switch_entity) {
        throw new Error('All charging entities must be specified when mode is "charge" or "both".');
      }
      
      this._entities.chargeStart = config.charge_start_entity;
      this._entities.chargeEnd = config.charge_end_entity;
      this._entities.chargeDayMask = config.charge_day_mask_entity;
      this._entities.chargePower = config.charge_power_entity;
      this._entities.chargingSwitch = config.charging_switch_entity;
    }
    
    if (this._mode === 'discharge' || this._mode === 'both') {
      if (!config.discharge_slots || !config.time_enable_entity || !config.discharging_switch_entity) {
        throw new Error('All discharging entities must be specified when mode is "discharge" or "both".');
      }
      
      this._entities.dischargeSlots = config.discharge_slots;
      this._entities.timeEnable = config.time_enable_entity;
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
    this._content.className = 'saj-h2-inverter-card';
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

    let cardContent = '<ha-card><div class="card-content">';
    
    // Render charging section if mode is 'charge' or 'both'
    if (this._mode === 'charge' || this._mode === 'both') {
      cardContent += this._renderChargingSection();
    }
    
    // Render discharging section if mode is 'discharge' or 'both'
    if (this._mode === 'discharge' || this._mode === 'both') {
      cardContent += this._renderDischargingSection();
    }
    
    cardContent += '</div></ha-card>';
    
    this._content.innerHTML = cardContent;
    this._addEventListeners();
  }

  // Render the charging section
  _renderChargingSection() {
    const s = this._entities;
    const es = this._hass.states;
    const start = es[s.chargeStart], end = es[s.chargeEnd], mask = es[s.chargeDayMask], power = es[s.chargePower], sw = es[s.chargingSwitch];
    
    if (!start || !end || !mask || !power || !sw) {
      return `
        <div class="card-error">
          <h2>Charging entity not found</h2>
          <p>Please check the configuration.</p>
        </div>
      `;
    }
    
    const chargeStart = start.state;
    const chargeEnd = end.state;
    const chargeDayMask = parseInt(mask.state) || 0;
    const chargePower = parseInt(power.state) || 0;
    const chargingEnabled = sw.state === 'on';
    const pendingWrite = sw.attributes && sw.attributes.pending_write === true;
    const days = this._getDaysFromMask(chargeDayMask);
    
    return `
      <div class="section charging-section">
        <div class="section-header">Charging Settings</div>
        
        <div class="subsection">
          <div class="subsection-header">Charging Time</div>
          <div class="time-row">
            <span class="time-label">Start:</span>
            <select id="charge-start-hour" class="time-select">${this._generateHourOptions(chargeStart)}</select>
            <span>:</span>
            <select id="charge-start-minute" class="time-select">${this._generateMinuteOptions(chargeStart)}</select>
            <span class="time-label">End:</span>
            <select id="charge-end-hour" class="time-select">${this._generateHourOptions(chargeEnd)}</select>
            <span>:</span>
            <select id="charge-end-minute" class="time-select">${this._generateMinuteOptions(chargeEnd)}</select>
          </div>
        </div>
        
        <div class="subsection">
          <div class="subsection-header">Charging Power <span class="power-value">${chargePower}%</span></div>
          <div class="slider-container">
            <input type="range" id="charge-power" min="0" max="25" step="1" value="${chargePower}" />
          </div>
        </div>
        
        <div class="subsection">
          <div class="subsection-header">Charging Days</div>
          <div class="days-selection">
            ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
              const short = day.slice(0,2);
              return `<label class="day-checkbox"><input type="checkbox" id="day-${day}" ${days[day] ? 'checked' : ''} /><span>${short.charAt(0).toUpperCase()+short.charAt(1)}</span></label>`;
            }).join('')}
          </div>
        </div>
        
        <div class="subsection">
          <div class="subsection-header">Charging Control</div>
          <button class="control-button ${chargingEnabled ? 'active' : ''}" id="charging-toggle">
            ${chargingEnabled ? 'Disable Charging' : 'Enable Charging'}
          </button>
          <div class="status-display">
            Status: <span class="status-value ${chargingEnabled ? 'active' : 'inactive'}">${pendingWrite ? 'Pending write...' : (chargingEnabled ? 'Active' : 'Inactive')}</span>
            ${pendingWrite ? '<div class="wait-message">Wait for modbus transfer</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Render the discharging section
  _renderDischargingSection() {
    const dischargingSwitchEntity = this._hass.states[this._entities.dischargingSwitch];
    const timeEnableEntity = this._hass.states[this._entities.timeEnable];
    
    if (!dischargingSwitchEntity || !timeEnableEntity) {
      return `
        <div class="card-error">
          <h2>Discharging entity not found</h2>
          <p>Please check the configuration.</p>
        </div>
      `;
    }
    
    const dischargingEnabled = dischargingSwitchEntity.state === 'on';
    const pendingWrite = dischargingSwitchEntity.attributes && dischargingSwitchEntity.attributes.pending_write === true;
    const timeEnableValue = parseInt(timeEnableEntity.state) || 0;
    
    // Prepare discharge slots data
    const dischargeSlots = this._entities.dischargeSlots.map((slot, index) => {
      const startTimeEntity = this._hass.states[slot.startTime];
      const endTimeEntity = this._hass.states[slot.endTime];
      const powerEntity = this._hass.states[slot.power];
      const dayMaskEntity = this._hass.states[slot.dayMask];
      
      // Check if slot entities exist
      const slotValid = startTimeEntity && endTimeEntity && powerEntity && dayMaskEntity;
      
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
    
    return `
      <div class="section discharging-section">
        <div class="section-header">Discharging Settings</div>
        
        <div class="subsection">
          <div class="subsection-header">Discharging Control</div>
          <button class="control-button ${dischargingEnabled ? 'active' : ''}" id="discharging-toggle">
            ${dischargingEnabled ? 'Disable Discharging' : 'Enable Discharging'}
          </button>
          <div class="status-display">
            Status: <span class="status-value ${dischargingEnabled ? 'active' : 'inactive'}">${pendingWrite ? 'Pending write...' : (dischargingEnabled ? 'Active' : 'Inactive')}</span>
            ${pendingWrite ? '<div class="wait-message">Wait for modbus transfer</div>' : ''}
          </div>
        </div>
        
        <div class="subsection">
          <div class="subsection-header">Discharge Time Slots</div>
          <div class="discharge-slots">
            ${dischargeSlots.map(slot => this._renderDischargeSlot(slot)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Render a single discharge slot
  _renderDischargeSlot(slot) {
    if (!slot.valid) {
      return '';
    }
    
    const days = this._getDaysFromMask(slot.dayMask);
    const slotEnabled = slot.enabled;
    
    return `
      <div class="discharge-slot ${slotEnabled ? 'enabled' : 'disabled'}">
        <div class="slot-row">
          <label class="slot-checkbox">
            <input type="checkbox" id="slot-${slot.index}-enabled" ${slotEnabled ? 'checked' : ''} />
            <span class="slot-number">Slot ${slot.index + 1}</span>
          </label>
          <div class="time-container">
            <select id="slot-${slot.index}-start-hour" class="time-select">
              ${this._generateHourOptions(slot.startTime)}
            </select>
            <span>:</span>
            <select id="slot-${slot.index}-start-minute" class="time-select">
              ${this._generateMinuteOptions(slot.startTime)}
            </select>
            <span class="time-separator">-</span>
            <select id="slot-${slot.index}-end-hour" class="time-select">
              ${this._generateHourOptions(slot.endTime)}
            </select>
            <span>:</span>
            <select id="slot-${slot.index}-end-minute" class="time-select">
              ${this._generateMinuteOptions(slot.endTime)}
            </select>
            <input type="number" id="slot-${slot.index}-power" class="power-input" min="0" max="100" step="1" value="${slot.power}" />
            <span>%</span>
          </div>
        </div>
        <div class="days-container">
          <div class="days-select">
            <label><input type="checkbox" id="slot-${slot.index}-day-mo" ${days.monday ? 'checked' : ''} />Mo</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-tu" ${days.tuesday ? 'checked' : ''} />Tu</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-we" ${days.wednesday ? 'checked' : ''} />We</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-th" ${days.thursday ? 'checked' : ''} />Th</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-fr" ${days.friday ? 'checked' : ''} />Fr</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-sa" ${days.saturday ? 'checked' : ''} />Sa</label>
            <label><input type="checkbox" id="slot-${slot.index}-day-su" ${days.sunday ? 'checked' : ''} />Su</label>
          </div>
        </div>
      </div>
    `;
  }

  // Add event listeners to the card elements
  _addEventListeners() {
    // Add charging event listeners if mode is 'charge' or 'both'
    if (this._mode === 'charge' || this._mode === 'both') {
      this._addChargingEventListeners();
    }
    
    // Add discharging event listeners if mode is 'discharge' or 'both'
    if (this._mode === 'discharge' || this._mode === 'both') {
      this._addDischargingEventListeners();
    }
  }

  // Add charging event listeners
  _addChargingEventListeners() {
    const q = id => this._content.querySelector(id);
    const getVal = (h, m) => `${h.value.padStart(2, '0')}:${m.value.padStart(2, '0')}`;

    // Charging toggle button
    const chargingToggle = q('#charging-toggle');
    if (chargingToggle) {
      chargingToggle.addEventListener('click', () => {
        const sw = this._hass.states[this._entities.chargingSwitch];
        if (!sw) return;
        
        // Show wait message
        const statusDisplay = q('.charging-section .status-display');
        const originalContent = statusDisplay.innerHTML;
        statusDisplay.innerHTML = '<div class="wait-message">Wait for modbus transfer</div>';
        
        // Restore original content after 2 seconds
        setTimeout(() => {
          statusDisplay.innerHTML = originalContent;
        }, 2000);
        
        const state = sw.state === 'on' ? 'off' : 'on';
        this._hass.callService('switch', `turn_${state}`, { entity_id: this._entities.chargingSwitch });
      });
    }

    // Time inputs
    q('#charge-start-hour')?.addEventListener('change', () => this._setTimeEntity(this._entities.chargeStart, getVal(q('#charge-start-hour'), q('#charge-start-minute'))));
    q('#charge-start-minute')?.addEventListener('change', () => this._setTimeEntity(this._entities.chargeStart, getVal(q('#charge-start-hour'), q('#charge-start-minute'))));
    q('#charge-end-hour')?.addEventListener('change', () => this._setTimeEntity(this._entities.chargeEnd, getVal(q('#charge-end-hour'), q('#charge-end-minute'))));
    q('#charge-end-minute')?.addEventListener('change', () => this._setTimeEntity(this._entities.chargeEnd, getVal(q('#charge-end-hour'), q('#charge-end-minute'))));

    // Power slider
    const powerSlider = q('#charge-power');
    if (powerSlider) {
      powerSlider.addEventListener('input', e => q('.power-value').textContent = `${e.target.value}%`);
      powerSlider.addEventListener('change', e => this._setNumberEntity(this._entities.chargePower, parseInt(e.target.value)));
    }

    // Day checkboxes
    ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(day => {
      const checkbox = q(`#day-${day}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          const days = {};
          ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(d => {
            const cb = q(`#day-${d}`);
            days[d] = cb ? cb.checked : false;
          });
          const mask = this._calculateDaymask(days);
          this._setNumberEntity(this._entities.chargeDayMask, mask);
        });
      }
    });
  }

  // Add discharging event listeners
  _addDischargingEventListeners() {
    const q = id => this._content.querySelector(id);
    
    // Discharging toggle button
    const dischargingToggle = q('#discharging-toggle');
    if (dischargingToggle) {
      dischargingToggle.addEventListener('click', () => {
        const sw = this._hass.states[this._entities.dischargingSwitch];
        if (!sw) return;
        
        // Show wait message
        const statusDisplay = q('.discharging-section .status-display');
        const originalContent = statusDisplay.innerHTML;
        statusDisplay.innerHTML = '<div class="wait-message">Wait for modbus transfer</div>';
        
        // Restore original content after 2 seconds
        setTimeout(() => {
          statusDisplay.innerHTML = originalContent;
        }, 2000);
        
        const state = sw.state === 'on' ? 'off' : 'on';
        this._hass.callService('switch', `turn_${state}`, { entity_id: this._entities.dischargingSwitch });
      });
    }

    // Get current time enable value
    const timeEnableEntity = this._hass.states[this._entities.timeEnable];
    let timeEnableValue = parseInt(timeEnableEntity?.state) || 0;

    // Add event listeners for each discharge slot
    this._entities.dischargeSlots.forEach((slot, index) => {
      // Slot enable checkbox
      const slotCheckbox = q(`#slot-${index}-enabled`);
      if (slotCheckbox) {
        slotCheckbox.addEventListener('change', () => {
          // Calculate new time enable value
          const bitValue = 1 << index;
          if (slotCheckbox.checked) {
            timeEnableValue |= bitValue; // Set bit
          } else {
            timeEnableValue &= ~bitValue; // Clear bit
          }
          this._setNumberEntity(this._entities.timeEnable, timeEnableValue);
        });
      }

      // Time inputs
      const startHour = q(`#slot-${index}-start-hour`);
      const startMinute = q(`#slot-${index}-start-minute`);
      const endHour = q(`#slot-${index}-end-hour`);
      const endMinute = q(`#slot-${index}-end-minute`);
      
      const updateStartTime = () => {
        if (startHour && startMinute) {
          const hour = startHour.value.padStart(2, '0');
          const minute = startMinute.value.padStart(2, '0');
          this._setTimeEntity(slot.startTime, `${hour}:${minute}`);
        }
      };
      
      const updateEndTime = () => {
        if (endHour && endMinute) {
          const hour = endHour.value.padStart(2, '0');
          const minute = endMinute.value.padStart(2, '0');
          this._setTimeEntity(slot.endTime, `${hour}:${minute}`);
        }
      };
      
      startHour?.addEventListener('change', updateStartTime);
      startMinute?.addEventListener('change', updateStartTime);
      endHour?.addEventListener('change', updateEndTime);
      endMinute?.addEventListener('change', updateEndTime);
      
      // Power input
      const powerInput = q(`#slot-${index}-power`);
      if (powerInput) {
        powerInput.addEventListener('change', e => {
          const value = parseInt(e.target.value);
          this._setNumberEntity(slot.power, value);
        });
      }
      
      // Day checkboxes
      const updateDayMask = () => {
        const days = {
          monday: q(`#slot-${index}-day-mo`)?.checked || false,
          tuesday: q(`#slot-${index}-day-tu`)?.checked || false,
          wednesday: q(`#slot-${index}-day-we`)?.checked || false,
          thursday: q(`#slot-${index}-day-th`)?.checked || false,
          friday: q(`#slot-${index}-day-fr`)?.checked || false,
          saturday: q(`#slot-${index}-day-sa`)?.checked || false,
          sunday: q(`#slot-${index}-day-su`)?.checked || false
        };
        const mask = this._calculateDaymask(days);
        this._setNumberEntity(slot.dayMask, mask);
      };
      
      ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].forEach(day => {
        const checkbox = q(`#slot-${index}-day-${day}`);
        checkbox?.addEventListener('change', updateDayMask);
      });
    });
  }

  // Generate hour options (0-23)
  _generateHourOptions(timeString) {
    const hour = this._getHourFromTimeString(timeString);
    let options = '';
    
    for (let i = 0; i < 24; i++) {
      const selected = i === hour ? 'selected' : '';
      const displayValue = i < 10 ? `0${i}` : `${i}`;
      options += `<option value="${i}" ${selected}>${displayValue}</option>`;
    }
    
    return options;
  }
  
  // Generate minute options (0-59)
  _generateMinuteOptions(timeString) {
    const minute = this._getMinuteFromTimeString(timeString);
    let options = '';
    
    for (let i = 0; i < 60; i++) {
      const selected = i === minute ? 'selected' : '';
      const displayValue = i < 10 ? `0${i}` : `${i}`;
      options += `<option value="${i}" ${selected}>${displayValue}</option>`;
    }
    
    return options;
  }

  // Set time entity value
  _setTimeEntity(entityId, value) {
    try {
      this._hass.callService('text', 'set_value', {
        entity_id: entityId,
        value: value
      });
      if (this._debug) {
        console.log(`SAJ H2 Inverter Card: Set ${entityId} to ${value}`);
      }
    } catch (error) {
      console.error(`SAJ H2 Inverter Card: Error setting ${entityId} to ${value}:`, error);
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
        console.log(`SAJ H2 Inverter Card: Set ${entityId} to ${value}`);
      }
    } catch (error) {
      console.error(`SAJ H2 Inverter Card: Error setting ${entityId} to ${value}:`, error);
    }
  }

  // Calculate daymask from selected days
  _calculateDaymask(days) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((sum, d, i) => sum + (days[d] ? 1 << i : 0), 0);
  }

  // Get days from daymask
  _getDaysFromMask(mask) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((obj, d, i) => (obj[d] = (mask & (1 << i)) !== 0, obj), {});
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

  // Card sizing
  getCardSize() {
    let size = 1; // Base size
    
    if (this._mode === 'charge' || this._mode === 'both') {
      size += 4; // Charging section size
    }
    
    if (this._mode === 'discharge' || this._mode === 'both') {
      const slotCount = this._entities.dischargeSlots.length;
      size += 2 + Math.min(slotCount, 3); // Discharging section base size + slots (max 3 for size calculation)
    }
    
    return size;
  }

  // Load CSS directly in the card
  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    
    // Add CSS directly to the card
    const style = document.createElement('style');
    style.textContent = `
      .saj-h2-inverter-card {
        padding: 16px;
      }
      
      .card-content {
        padding: 16px;
      }
      
      .section {
        margin-bottom: 24px;
      }
      
      .section:last-child {
        margin-bottom: 0;
      }
      
      .section-header {
        font-size: 1.2rem;
        font-weight: 500;
        margin-bottom: 16px;
        color: var(--primary-color);
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      
      .subsection {
        margin-bottom: 16px;
      }
      
      .subsection:last-child {
        margin-bottom: 0;
      }
      
      .subsection-header {
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--primary-text-color);
      }

      /* Time row */
      .time-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      /* Time select */
      .time-select {
        padding: 4px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background-color: var(--card-background-color);
        color: var(--primary-text-color);
        width: 50px;
        text-align: center;
        font-size: 1.1em;
      }

      /* Slider container */
      .slider-container {
        display: flex;
        align-items: center;
        width: 100%;
      }

      input[type="range"] {
        width: 100%;
        margin: 8px 0;
      }

      /* Days selection */
      .days-selection {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .day-checkbox {
        font-size: 0.9em;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .day-checkbox input {
        margin: 0;
      }
      
      /* Time display */
      .time-display {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      .time-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .time-label {
        font-weight: 500;
      }
      
      .time-value {
        font-size: 1.1em;
        padding: 4px 8px;
        background-color: var(--secondary-background-color);
        border-radius: 4px;
      }
      
      /* Power display */
      .power-display {
        display: flex;
        align-items: center;
      }
      
      .power-value {
        font-size: 1.1em;
        font-weight: 500;
        padding: 4px 8px;
        background-color: var(--secondary-background-color);
        border-radius: 4px;
      }
      
      /* Days display */
      .days-display {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .day-indicator {
        display: inline-block;
        width: 30px;
        text-align: center;
        padding: 4px 0;
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: 500;
      }
      
      .day-indicator.active {
        background-color: var(--primary-color);
        color: white;
      }
      
      .day-indicator.inactive {
        background-color: var(--secondary-background-color);
        color: var(--disabled-text-color);
      }
      
      /* Control button */
      .control-button {
        width: 100%;
        padding: 12px;
        border-radius: 4px;
        border: none;
        background-color: var(--primary-color);
        color: white;
        font-weight: 500;
        cursor: pointer;
        margin-bottom: 8px;
        font-size: 1em;
      }
      
      .control-button.active {
        background-color: var(--error-color);
      }
      
      /* Status display */
      .status-display {
        text-align: center;
        font-size: 0.9em;
      }
      
      .status-value.active {
        color: var(--success-color);
        font-weight: 500;
      }
      
      .status-value.inactive {
        color: var(--error-color);
      }
      
      /* Discharge slots */
      .discharge-slots {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .discharge-slot {
        padding: 12px;
        border-radius: 4px;
        background-color: var(--secondary-background-color);
        border-left: 4px solid var(--primary-color);
      }
      
      .discharge-slot.disabled {
        border-left-color: var(--disabled-text-color);
        opacity: 0.7;
      }
      
      .slot-row {
        display: flex;
        flex-direction: column;
        margin-bottom: 8px;
      }
      
      .slot-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        cursor: pointer;
      }
      
      .time-container {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .time-separator {
        margin: 0 4px;
      }
      
      .power-input {
        width: 50px;
        padding: 4px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background-color: var(--card-background-color);
        color: var(--primary-text-color);
        text-align: center;
        margin: 0 4px;
        font-size: 1.1em;
      }
      
      .days-container {
        margin-top: 8px;
      }
      
      .days-select {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      
      .days-select label {
        font-size: 0.9em;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .days-select input {
        margin: 0;
      }
      
      /* Error display */
      .card-error {
        padding: 16px;
        color: var(--error-color);
        background-color: var(--error-color-translucent);
        border-radius: 4px;
        margin-bottom: 16px;
      }
      
      .card-error h2 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 1.1em;
      }
      
      .card-error p {
        margin: 0;
      }
      
      /* Wait message */
      .wait-message {
        font-weight: 500;
        color: var(--warning-color);
        padding: 8px;
        background-color: var(--warning-color-translucent, rgba(255, 152, 0, 0.2));
        border-radius: 4px;
        text-align: center;
        margin-top: 8px;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
    `;
    this.appendChild(style);
  }
}

// Register the element
customElements.define('saj-h2-inverter-card', SajH2InverterCard);

// Add the card to the custom cards list
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'saj-h2-inverter-card',
  name: 'SAJ H2 Inverter Card',
  description: 'Card for controlling charging and discharging settings for SAJ H2 inverters'
});
