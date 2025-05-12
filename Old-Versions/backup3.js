/**
 * SAJ H2 Inverter Card
 * Custom card for Home Assistant to control SAJ H2 Inverter charging and discharging settings
 * 
 * @author stanu74 
 * @version 1.0.3
 */

class SajH2InverterCard extends HTMLElement {
  static get DEFAULT_ENTITIES() {
    return {
      // Charging entities
      chargeStart: 'text.saj_charge_start_time_time',
      chargeEnd: 'text.saj_charge_end_time_time',
      chargeDayMask: 'number.saj_charge_day_mask_input',
      chargePower: 'number.saj_charge_power_percent_input',
      chargingSwitch: 'switch.saj_charging_control',
      
      // Discharging entities
      dischargeSlots: [
        { startTime: 'text.saj_discharge_start_time_time', endTime: 'text.saj_discharge_end_time_time', power: 'number.saj_discharge_power_percent_input', dayMask: 'number.saj_discharge_day_mask_input' },
        { startTime: 'text.saj_discharge2_start_time_time', endTime: 'text.saj_discharge2_end_time_time', power: 'number.saj_discharge2_power_percent_input', dayMask: 'number.saj_discharge2_day_mask_input' },
        { startTime: 'text.saj_discharge3_start_time_time', endTime: 'text.saj_discharge3_end_time_time', power: 'number.saj_discharge3_power_percent_input', dayMask: 'number.saj_discharge3_day_mask_input' },
        { startTime: 'text.saj_discharge4_start_time_time', endTime: 'text.saj_discharge4_end_time_time', power: 'number.saj_discharge4_power_percent_input', dayMask: 'number.saj_discharge4_day_mask_input' },
        { startTime: 'text.saj_discharge5_start_time_time', endTime: 'text.saj_discharge5_end_time_time', power: 'number.saj_discharge5_power_percent_input', dayMask: 'number.saj_discharge5_day_mask_input' },
        { startTime: 'text.saj_discharge6_start_time_time', endTime: 'text.saj_discharge6_end_time_time', power: 'number.saj_discharge6_power_percent_input', dayMask: 'number.saj_discharge6_day_mask_input' },
        { startTime: 'text.saj_discharge7_start_time_time', endTime: 'text.saj_discharge7_end_time_time', power: 'number.saj_discharge7_power_percent_input', dayMask: 'number.saj_discharge7_day_mask_input' }
      ],
      timeEnable: 'number.saj_discharge_time_enable_input',
      dischargingSwitch: 'switch.saj_discharging_control'
    };
  }

   constructor() {
    super();
    this._entities = JSON.parse(JSON.stringify(SajH2InverterCard.DEFAULT_ENTITIES));
    this._mode = 'both';
    this._hass = null;
    this._debug = false;
    // Removed debounce timer
  }


  // Card configuration
  setConfig(config) {
    // Set mode
    this._mode = config.mode || 'both'; // Default to 'both' if not specified
    
    if (!['charge', 'discharge', 'both'].includes(this._mode)) {
      throw new Error(`Invalid mode: ${this._mode}. Must be one of: charge, discharge, both`);
    }
    
    // Entities are now hardcoded and initialized in the constructor using DEFAULT_ENTITIES.
    // The `this._entities` object is already populated with the default entity IDs.
    // No need to validate or load them from the config object here.
    
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
    // Check if any relevant states have changed before triggering a render
    if (this._shouldUpdate(hass)) {
      this._hass = hass;
      this._renderCard();
    } else {
      // Still update internal hass object without rendering
      this._hass = hass;
    }
  }

  // Helper to check if we should update the card
  _shouldUpdate(newHass) {
    if (!this._hass) return true; // Always update if no previous state
    
    const relevantEntities = [
      // Charging entities
      this._entities.chargeStart,
      this._entities.chargeEnd,
      this._entities.chargeDayMask,
      this._entities.chargePower,
      this._entities.chargingSwitch,
      // Discharging entities
      this._entities.timeEnable,
      this._entities.dischargingSwitch,
      // Add all discharge slot entities
      ...this._entities.dischargeSlots.flatMap(slot => [
        slot.startTime,
        slot.endTime,
        slot.power,
        slot.dayMask
      ])
    ];

    // Check if any relevant entity has changed
    return relevantEntities.some(entityId => {
      const oldState = this._hass.states[entityId];
      const newState = newHass.states[entityId];
      
      if (!oldState || !newState) return true;
      
      // Compare state and attributes that matter
      return oldState.state !== newState.state || 
             oldState.attributes?.pending_write !== newState.attributes?.pending_write;
    });
  }

   // Render the card content
  _renderCard() {
    if (!this._hass) return;

    // --- Save Focus and Interaction State ---
    const activeElement = document.activeElement;
    const isWithinCard = activeElement && this._content?.contains(activeElement);
    
    // Skip rendering if user is interacting with time or number inputs
    if (isWithinCard && 
        activeElement.tagName === 'INPUT' && 
        (activeElement.type === 'time' || activeElement.type === 'number') &&
        activeElement.closest('.time-input-container')) {
        return;
    }

    // Store focus state for restoration
    let focusState = null;
    if (isWithinCard && activeElement.tagName === 'INPUT') {
        focusState = {
            id: activeElement.id,
            type: activeElement.type,
            value: activeElement.type === 'checkbox' ? activeElement.checked : activeElement.value,
            selectionStart: null,
            selectionEnd: null
        };
        
        try {
            focusState.selectionStart = activeElement.selectionStart;
            focusState.selectionEnd = activeElement.selectionEnd;
        } catch (e) { /* Ignore selection errors for unsupported input types */ }
    }

    // Generate card content
    let cardContent = '<ha-card><div class="card-content">';
    
    if (this._mode === 'charge' || this._mode === 'both') {
        cardContent += this._renderChargingSection();
    }
    
    if (this._mode === 'discharge' || this._mode === 'both') {
        cardContent += this._renderDischargingSection();
    }
    
    cardContent += '</div></ha-card>';

    // Save scroll position
    const scrollPosition = this._content.scrollTop;

    // Update content
    this._content.innerHTML = cardContent;

    // Restore scroll position
    this._content.scrollTop = scrollPosition;

    // Restore focus state if needed
    if (focusState) {
        requestAnimationFrame(() => {
            const elementToRestore = this._content.querySelector(`#${focusState.id}`);
            if (elementToRestore && this.isConnected && this._content.contains(elementToRestore)) {
                // Restore value
                if (focusState.type === 'checkbox') {
                    elementToRestore.checked = focusState.value;
                } else {
                    elementToRestore.value = focusState.value;
                }

                // Restore focus
                elementToRestore.focus();

                // Restore selection if applicable
                if (focusState.selectionStart !== null && 
                    focusState.selectionEnd !== null && 
                    typeof elementToRestore.setSelectionRange === 'function') {
                    try {
                        elementToRestore.setSelectionRange(
                            focusState.selectionStart,
                            focusState.selectionEnd
                        );
                    } catch (e) { /* Ignore selection errors */ }
                }
            }
        });
    }
  
  // Restore scroll position (optional)
  // this.scrollTop = scrollY;

  // Add event listeners AFTER updating innerHTML and restoring focus
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
              <input type="range" id="charge-power" class="power-slider" min="0" max="25" step="1" value="${chargePower}" />
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
    // Use the specific switch switch.saj_discharging_control for the status
    const dischargingSwitchEntity = this._hass.states['switch.saj_discharging_control'] || this._hass.states[this._entities.dischargingSwitch];
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
      // Update display during interaction
      powerSlider.addEventListener('input', e => q('.power-value').textContent = `${e.target.value}%`);
      // Set state only when interaction ends
      powerSlider.addEventListener('change', e => this._setEntityValue(this._entities.chargePower, parseInt(e.target.value), 'number'));
      // Removed interaction flag listeners
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
        // Use the specific switch switch.saj_discharging_control
        const switchEntity = 'switch.saj_discharging_control';
        const sw = this._hass.states[switchEntity] || this._hass.states[this._entities.dischargingSwitch];
        if (!sw) return;
        
        // Show wait message
        const statusDisplay = q('.discharging-section .status-display');
        const originalContent = statusDisplay.innerHTML;
        statusDisplay.innerHTML = '<div class="wait-message">Waiting for Modbus transfer</div>';
        
        // Restore original content after 2 seconds
        setTimeout(() => {
          statusDisplay.innerHTML = originalContent;
        }, 2000);
        
        const state = sw.state === 'on' ? 'off' : 'on';
        this._hass.callService('switch', `turn_${state}`, { entity_id: switchEntity });
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
      
      // We remove the event listener for the slot header so that only a click on the checkbox itself toggles the checkbox

      // Time inputs
      this._setupTimeListeners(`slot-${index}`, slot.startTime, slot.endTime);
      
      // Power slider
      const powerSlider = q(`#slot-${index}-power`);
      if (powerSlider) {
        // Update display during interaction
        powerSlider.addEventListener('input', e => {
          const powerValue = q(`.discharge-slot:nth-child(${index + 1}) .power-value`);
          if (powerValue) {
            powerValue.textContent = `${e.target.value}%`;
          }
        });
        // Set state only when interaction ends
        powerSlider.addEventListener('change', e => {
          const value = parseInt(e.target.value);
          this._setEntityValue(slot.power, value, 'number');
        });
        // Removed interaction flag listeners
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

  // Render time inputs with simple visible inputs
  _renderTimeSelects(prefix, startTime, endTime, powerValue = null) {
    const start = startTime || '00:00';
    const end = endTime || '00:00';

    return `
      <div class="time-box-container">
        <div class="time-box start-time">
          <div class="time-box-label">Start</div>
          <div class="time-input-container">
            <input type="time" id="${prefix}-start-time" class="time-input" value="${start}" step="300" />
           
          </div>
        </div>
        <div class="time-box end-time">
          <div class="time-box-label">End</div>
          <div class="time-input-container">
             <input type="time" id="${prefix}-end-time" class="time-input" value="${end}" step="300" />
           
            
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
    // Adjusted texts for discharging status
    let buttonText, statusText;
    
    if (type === 'discharging') {
      buttonText = enabled ? 'Disable Discharging' : 'Enable Discharging';
      statusText = pending ? 'Transfer pending...' : (enabled ? 'Discharging active' : 'Discharging inactive');
    } else { // 'charging'
      buttonText = enabled ? 'Disable Charging' : 'Enable Charging';
      statusText = pending ? 'Pending write...' : (enabled ? 'Charging active' : 'Charging inactive');
    }
    
    return `
      <button class="control-button ${enabled ? 'active' : ''}" id="${type}-toggle">
        ${buttonText}
      </button>
      <div class="status-display">
        Status: <span class="status-value ${enabled ? 'active' : 'inactive'}">${statusText}</span>
        ${pending ? '<div class="wait-message">Wait for modbus transfer</div>' : ''}
      </div>
    `;
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

  
  

  // Simple time listeners for visible inputs
_setupTimeListeners(prefix, startEntity, endEntity) {
  const q = id => this._content.querySelector(id);

  const setupInputListener = (inputId, entity) => {
    const inputElement = q(`#${inputId}`);
    if (!inputElement) return;

    // Removed interaction flag listeners (focus, blur, click)

    // Set state on change
    inputElement.addEventListener('change', (event) => {
      this._setEntityValue(entity, event.target.value);
    });

  };

  setupInputListener(`${prefix}-start-time`, startEntity);
  setupInputListener(`${prefix}-end-time`, endEntity);
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
      .saj-h2-inverter-card, .card-content { padding: 16px; }
      .section { margin-bottom: 24px; }
      .charging-section, .discharging-section {
        border: 1px solid var(--divider-color);
        border-radius: 12px; /* Rounded corners */
        padding: 16px; /* Inner padding */
        background-color: var(--card-background-color); /* Ensure background for the box */
        /* margin-bottom is inherited from .section or can be adjusted if needed */
      }
      .section-header { font-size: 1.25rem; font-weight: 500; margin-bottom: 16px; color: var(--primary-color); border-bottom: 1px solid var(--divider-color); padding-bottom: 8px; letter-spacing: 0.5px; }
      .subsection { margin-bottom: 20px; /* Removed padding-left: 8px; and border-left: 2px solid var(--divider-color); */ }
      .subsection-header { font-size: 1.1rem; font-weight: 500; margin-bottom: 10px; color: var(--primary-text-color); }
      
      /* Time box container */
      .time-box-container { display: flex; align-items: flex-end; /* Align boxes at the bottom */ justify-content: space-between; width: 95%; /* Increased width slightly */ background-color: var(--secondary-background-color); border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); gap: 2%; /* Add gap between boxes */ }
      .time-box { display: flex; flex-direction: column; align-items: center; width: 32%; /* Divide into roughly thirds, considering gap */ }
      .start-time, .end-time { /* Removed width: 40%; */ }
      .power-time { /* Removed width: 20%; */ display: flex; flex-direction: column; align-items: center; /* Center content horizontally */ /* Removed justify-content: flex-end; as parent align-items handles bottom alignment */ }
      .power-placeholder { display: flex; align-items: center; justify-content: center; width: auto; /* Let content size dictate width */ /* Removed min-width */ }
      .time-box-label { font-size: 0.9em; font-weight: 500; margin-bottom: 6px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px; }
      /* Time input wrapper */
      /* Time input container */
      
     .time-input-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        border: 1px solid var(--input-ink-color, var(--divider-color));
        border-radius: 8px;
        padding: 4px 6px;
        background-color: var(--input-fill-color, var(--card-background-color));
      }
      
      .time-picker-button {
        background: none;
        border: none;
        padding: 0 6px;
        color: var(--primary-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease;
        font-size: 1.5em;
      }

      .time-picker-button:hover {
        transform: scale(1.2);
      }

      
      .time-input {
        width: 100%;
        padding: 10px;
        border: none;
        background-color: transparent;
        color: var(--primary-text-color);
        font-size: 1.15em;
        font-weight: 500;
        text-align: center;
        color-scheme: light dark;
      }
      
      /* Focus effect for time input */
      .time-input:focus {
        outline: none;
      }
      
      /* Hover effect for time input container */
      .time-input-container:hover {
        background-color: rgba(var(--rgb-primary-color, 33, 150, 243), 0.1);
        border-color: var(--primary-color);
      }
      .time-colon { font-weight: bold; color: var(--primary-color); margin: 0 4px; font-size: 1.1em; }

      /* Removed Time Separator - not used */

      .time-row, .days-selection, .discharge-slots, .slot-row, .days-select { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
      .time-power-container { display: flex; flex-direction: column; margin-bottom: 12px; }
      .time-power-row { display: flex; align-items: center; justify-content: flex-start; gap: 16px; margin-bottom: 12px; }
      .power-value { font-size: 1.15em; /* Match font-size of time-select */ font-weight: 500; padding: 12px 10px; /* Match time-selects padding */ background-color: var(--input-fill-color, var(--card-background-color)); border-radius: 8px; /* Match time-selects */ text-align: center; border: 1px solid var(--input-ink-color, var(--divider-color)); /* Match time-selects */ display: inline-block; min-height: 30px; /* Ensure a minimum height */ line-height: normal; /* Adjust if needed for vertical centering with padding */ box-sizing: border-box; /* Include padding and border in the element's total width and height */ min-width: 80px; /* Set minimum width */ }
      .day-checkbox, .slot-checkbox { display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .day-checkbox span { font-size: 1.05em; } /* Increased font size for day labels */
      .day-checkbox input[type="checkbox"], .slot-checkbox input[type="checkbox"] { transform: scale(1.1); margin-right: 4px; }

      .control-button { width: 100%; padding: 14px; font-size: 1.15rem; border-radius: 8px; border: none; background-color: var(--primary-color); color: var(--text-primary-color-on-primary, white); font-weight: 500; cursor: pointer; margin-bottom: 10px; transition: background-color 0.2s ease, transform 0.1s ease; }
      .control-button:hover { background-color: var(--state-active-color, var(--primary-color)); filter: brightness(110%); }
      .control-button:active { transform: scale(0.98); }
      .control-button.active { background-color: var(--error-color); }
      .control-button.active:hover { filter: brightness(110%); }

      .discharge-slot { padding: 16px; border-radius: 8px; background-color: var(--secondary-background-color); border-left: 5px solid var(--primary-color); margin-bottom: 10px; width: 95%; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      .discharge-slot.disabled { border-left-color: var(--disabled-text-color); }
      .slot-header { cursor: pointer; padding: 4px 0; }
      .slot-content { margin-top: 12px; overflow: hidden; transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out; }
      .slot-content.visible { max-height: 500px; opacity: 1; }
      .slot-content.hidden { max-height: 0; opacity: 0; margin-top: 0; }
      .power-slider { width: 100%; margin: 8px 0; }
      .wait-message { font-weight: 500; color: var(--warning-color); padding: 8px; background-color: rgba(255, 152, 0, 0.2); border-radius: 4px; text-align: center; margin-top: 8px; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

      /* Responsive adjustments for smaller screens (like phones) */
      @media (max-width: 450px) {
        .time-box-container {
          flex-direction: column; /* Stack time boxes vertically */
          align-items: stretch; /* Stretch boxes to full width */
          width: 100%; /* Use full width */
          padding: 10px;
          gap: 12px; /* Add gap between stacked boxes */
        }
        .time-box {
          width: 100%; /* Make each box take full width */
          align-items: center; /* Center content within the box */
        }
        .power-time {
           align-items: center; /* Ensure power content is centered */
        }
        .time-selects {
           justify-content: center; /* Center the time selects within their box */
           padding: 6px 5px; /* Adjust padding slightly if needed */
        }
         .power-placeholder {
           justify-content: center; /* Center the power value */
           width: 100%;
        }
        .power-value {
           min-width: 70px; /* Adjust min-width for phone screens */
           padding: 6px 8px; /* Adjust padding */
        }
        .days-selection, .days-select {
          justify-content: center; /* Center day checkboxes */
          gap: 6px; /* Reduce gap */
        }
        .day-checkbox span {
          font-size: 0.9em; /* Slightly smaller text for days */
        }
        .discharge-slot {
          width: 100%; /* Ensure slots take full width */
          padding: 12px; /* Adjust padding */
        }
        .section-header { font-size: 1.15rem; }
        .subsection-header { font-size: 1.05rem; }
        .control-button { font-size: 1.1rem; padding: 12px; }
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
