/**
 * SAJ H2 Inverter Card
 * Custom card for Home Assistant to control SAJ H2 Inverter charging and discharging settings
 * 
 * @author stanus74
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
      
      return `
        <div class="section charging-section">
          <div class="section-header">Charging Settings</div>
          
          <div class="subsection">
            <div class="subsection-header">Charging Time</div>
            <div class="time-power-container">
              <div class="time-power-row">
                ${this._renderTimeSelects('charge', chargeStart, chargeEnd, chargePower)}
              </div>
              <div class="slider-container">
                <input type="range" id="charge-power" min="0" max="25" step="1" value="${chargePower}" />
              </div>
            </div>
          </div>
          
          <div class="subsection">
            <div class="subsection-header">Charging Days</div>
            <div class="days-selection">
              ${this._renderDayCheckboxes('charge', chargeDayMask)}
            </div>
          </div>
          
          <div class="subsection">
            <div class="subsection-header">Charging Control</div>
            ${this._renderStatusButton(chargingEnabled, pendingWrite, 'charging')}
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
            ${this._renderStatusButton(dischargingEnabled, pendingWrite, 'discharging')}
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
          <div class="slot-header">
            <label class="slot-checkbox">
              <input type="checkbox" id="slot-${slot.index}-enabled" ${slotEnabled ? 'checked' : ''} />
              <span class="slot-number">Slot ${slot.index + 1}</span>
            </label>
          </div>
          <div class="slot-content ${slotEnabled ? 'visible' : 'hidden'}">
            <div class="time-power-container">
              <div class="time-power-row">
                ${this._renderTimeSelects(`slot-${slot.index}`, slot.startTime, slot.endTime, slot.power)}
              </div>
              <div class="slider-container">
                <input type="range" id="slot-${slot.index}-power" class="power-slider" min="0" max="100" step="1" value="${slot.power}" />
              </div>
            </div>
            <div class="days-container">
              <div class="days-select">
                ${this._renderDayCheckboxes(`slot-${slot.index}`, slot.dayMask)}
              </div>
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
      this._setupTimeListeners('charge', this._entities.chargeStart, this._entities.chargeEnd);
  
      // Power slider
      const powerSlider = q('#charge-power');
      if (powerSlider) {
        powerSlider.addEventListener('input', e => q('.power-value').textContent = `${e.target.value}%`);
        powerSlider.addEventListener('change', e => this._setEntityValue(this._entities.chargePower, parseInt(e.target.value), 'number'));
      }
  
      // Day checkboxes
      this._setupDayListeners('charge', this._entities.chargeDayMask);
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
            this._setEntityValue(this._entities.timeEnable, timeEnableValue, 'number');
            
            // Toggle slot content visibility
            const slotContent = q(`#slot-${index}-enabled`).closest('.discharge-slot').querySelector('.slot-content');
            if (slotCheckbox.checked) {
              slotContent.classList.remove('hidden');
              slotContent.classList.add('visible');
            } else {
              slotContent.classList.remove('visible');
              slotContent.classList.add('hidden');
            }
          });
        }
        
        // Wir entfernen den Event-Listener für den Slot-Header, damit nur ein Klick auf die Checkbox selbst die Checkbox umschaltet
  
        // Time inputs
        this._setupTimeListeners(`slot-${index}`, slot.startTime, slot.endTime);
        
        // Power slider
        const powerSlider = q(`#slot-${index}-power`);
        if (powerSlider) {
          powerSlider.addEventListener('input', e => {
            const powerValue = q(`.discharge-slot:nth-child(${index + 1}) .power-value`);
            if (powerValue) {
              powerValue.textContent = `${e.target.value}%`;
            }
          });
          
          powerSlider.addEventListener('change', e => {
            const value = parseInt(e.target.value);
            this._setEntityValue(slot.power, value, 'number');
          });
        }
        
        // Day checkboxes
        this._setupDayListeners(`slot-${index}`, slot.dayMask);
      });
    }
  
    // Generate time options helper
    _generateTimeOptions(type, selectedValue) {
      const max = type === 'hour' ? 24 : 60;
      return Array.from({length: max}, (_, i) => {
        const val = i.toString().padStart(2, '0');
        return `<option value="${i}" ${i === selectedValue ? 'selected' : ''}>${val}</option>`;
      }).join('');
    }
  
    // Simplified time string parser
    _parseTime(timeString) {
      const [h = '0', m = '0'] = (timeString || '00:00').split(':');
      return { hour: parseInt(h) || 0, minute: parseInt(m) || 0 };
    }
  
    // Combined entity setter
    _setEntityValue(entityId, value, type = 'text') {
      try {
        this._hass.callService(type, 'set_value', { entity_id: entityId, value });
        this._debug && console.log(`SAJ H2 Inverter Card: Set ${entityId} to ${value}`);
      } catch (error) {
        console.error(`SAJ H2 Inverter Card: Error setting ${entityId}:`, error);
      }
    }
  
    // Render time selects with improved styling
    _renderTimeSelects(prefix, startTime, endTime, powerValue = null) {
      const start = this._parseTime(startTime);
      const end = this._parseTime(endTime);
      return `
        <div class="time-box-container">
          <div class="time-box start-time">
            <div class="time-box-label">Start</div>
            <div class="time-selects">
              <select id="${prefix}-start-hour" class="time-select">${this._generateTimeOptions('hour', start.hour)}</select>
              <span class="time-colon">:</span>
              <select id="${prefix}-start-minute" class="time-select">${this._generateTimeOptions('minute', start.minute)}</select>
            </div>
          </div>
          <div class="time-box end-time">
            <div class="time-box-label">Ende</div>
            <div class="time-selects">
              <select id="${prefix}-end-hour" class="time-select">${this._generateTimeOptions('hour', end.hour)}</select>
              <span class="time-colon">:</span>
              <select id="${prefix}-end-minute" class="time-select">${this._generateTimeOptions('minute', end.minute)}</select>
            </div>
          </div>
          <div class="time-box power-time">
            <div class="time-box-label">Power</div>
            <div class="power-placeholder">
              ${powerValue !== null ? `<span class="power-value">${powerValue}%</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }
  
    _renderDayCheckboxes(prefix, dayMask) {
      const days = this._getDaysFromMask(dayMask);
      return ['Mo','Tu','We','Th','Fr','Sa','Su'].map((day, i) => `
        <label class="day-checkbox">
          <input type="checkbox" id="${prefix}-day-${day.toLowerCase()}" ${days[Object.keys(days)[i]] ? 'checked' : ''} />
          <span>${day}</span>
        </label>
      `).join('');
    }
  
    _renderStatusButton(enabled, pending, type) {
      return `
        <button class="control-button ${enabled ? 'active' : ''}" id="${type}-toggle">
          ${enabled ? 'Disable' : 'Enable'} ${type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
        <div class="status-display">
          Status: <span class="status-value ${enabled ? 'active' : 'inactive'}">${pending ? 'Pending write...' : (enabled ? 'Active' : 'Inactive')}</span>
          ${pending ? '<div class="wait-message">Wait for modbus transfer</div>' : ''}
        </div>
      `;
    }
  
    // Simplified event listener setup
    _setupTimeListeners(prefix, startEntity, endEntity) {
      const q = id => this._content.querySelector(id);
      ['start', 'end'].forEach(type => {
        ['hour', 'minute'].forEach(unit => {
          q(`#${prefix}-${type}-${unit}`)?.addEventListener('change', () => {
            const entity = type === 'start' ? startEntity : endEntity;
            const h = q(`#${prefix}-${type}-hour`).value.padStart(2, '0');
            const m = q(`#${prefix}-${type}-minute`).value.padStart(2, '0');
            this._setEntityValue(entity, `${h}:${m}`);
          });
        });
      });
    }
  
    _setupDayListeners(prefix, dayMaskEntity) {
      const q = id => this._content.querySelector(id);
      ['mo','tu','we','th','fr','sa','su'].forEach(day => {
        q(`#${prefix}-day-${day}`)?.addEventListener('change', () => {
          const days = {};
          ['mo','tu','we','th','fr','sa','su'].forEach((d, i) => {
            days[Object.keys(this._getDaysFromMask(0))[i]] = q(`#${prefix}-day-${d}`)?.checked || false;
          });
          this._setEntityValue(dayMaskEntity, this._calculateDaymask(days), 'number');
        });
      });
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
        
        .subsection-header {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--primary-text-color);
        }
  
        /* Time box container */
        .time-box-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 80%;
          background-color: var(--secondary-background-color);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
  
        /* Time box */
        .time-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
  
        .start-time, .end-time {
          width: 40%;
        }
  
        .power-time {
          width: 20%;
        }
  
        /* Power placeholder */
        .power-placeholder {
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
  
        /* Time box label */
        .time-box-label {
          font-size: 0.85em;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
  
        /* Time selects container */
        .time-selects {
          display: flex;
          align-items: center;
          background-color: var(--card-background-color);
          border-radius: 6px;
          padding: 4px 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
  
        /* Time select */
        .time-select {
          padding: 4px;
          border: none;
          background-color: transparent;
          color: var(--primary-text-color);
          width: 40px;
          text-align: center;
          font-size: 1.1em;
          font-weight: 500;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          cursor: pointer;
        }
  
        /* Time colon */
        .time-colon {
          font-weight: bold;
          color: var(--primary-color);
          margin: 0 2px;
        }
  
        /* Time separator */
        .time-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 10%;
          position: relative;
        }
  
        /* Separator line */
        .separator-line {
          display: block;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color);
          position: relative;
        }
  
        .separator-line:before,
        .separator-line:after {
          content: '';
          position: absolute;
          width: 6px;
          height: 6px;
          background-color: var(--primary-color);
          border-radius: 50%;
          top: -2px;
        }
  
        .separator-line:before {
          left: 0;
        }
  
        .separator-line:after {
          right: 0;
        }
  
        /* Other styles */
        .time-row, .days-selection, .discharge-slots, .slot-row, .days-select {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
  
        /* Time power container */
        .time-power-container {
          display: flex;
          flex-direction: column;
          margin-bottom: 10px;
        }
  
        /* Time power row */
        .time-power-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }
  
        /* Power value */
        .power-value {
          font-size: 1.1em;
          font-weight: 500;
          padding: 4px 8px;
          background-color: var(--secondary-background-color);
          border-radius: 4px;
          text-align: center;
        }
  
        .day-checkbox, .slot-checkbox {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
  
        .control-button {
          width: 100%;
          padding: 12px;
          font-size: 1.1rem;
          border-radius: 4px;
          border: none;
          background-color: var(--primary-color);
          color: white;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 8px;
        }
  
        .control-button.active {
          background-color: var(--error-color);
        }
  
        /* Discharge slot */
        .discharge-slot {
          padding: 12px;
          border-radius: 4px;
          background-color: var(--secondary-background-color);
          border-left: 4px solid var(--primary-color);
          margin-bottom: 8px;
          width: 90%;
        }
  
        .discharge-slot.disabled {
          border-left-color: var(--disabled-text-color);
        }
  
        /* Slot header */
        .slot-header {
          cursor: pointer;
          padding: 4px 0;
        }
  
        /* Slot content */
        .slot-content {
          margin-top: 12px;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
        }
  
        .slot-content.visible {
          max-height: 500px;
          opacity: 1;
        }
  
        .slot-content.hidden {
          max-height: 0;
          opacity: 0;
          margin-top: 0;
        }
  
        /* Power slider */
        .power-slider {
          width: 100%;
          margin: 8px 0;
        }
  
        .wait-message {
          font-weight: 500;
          color: var(--warning-color);
          padding: 8px;
          background-color: rgba(255, 152, 0, 0.2);
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
  