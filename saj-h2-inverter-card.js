/**
 * SAJ H2 Inverter Card
 * Custom card for Home Assistant to control SAJ H2 Inverter charging and discharging settings
 *
 * @author stanu74 (Updated with Shadow DOM & Config)
 * @version 1.1.0
 */

class SajH2InverterCard extends HTMLElement {
  static get DEFAULT_ENTITIES() {
    return {
      // Charging entities
      chargeStart: 'text.saj_charge_start_time_time',
      chargeEnd:   'text.saj_charge_end_time_time',
      chargeDayMask: 'number.saj_charge_day_mask_input',
      chargePower: 'number.saj_charge_power_percent_input',
      chargingSwitch: 'switch.saj_charging_control',

      // Discharging entities
      dischargeSlots: [
        { startTime: 'text.saj_discharge_start_time_time', endTime: 'text.saj_discharge_end_time_time', power: 'number.saj_discharge_power_percent_input',     dayMask: 'number.saj_discharge_day_mask_input' },
        { startTime: 'text.saj_discharge2_start_time_time', endTime: 'text.saj_discharge2_end_time_time', power: 'number.saj_discharge2_power_percent_input', dayMask: 'number.saj_discharge2_day_mask_input' },
        { startTime: 'text.saj_discharge3_start_time_time', endTime: 'text.saj_discharge3_end_time_time', power: 'number.saj_discharge3_power_percent_input', dayMask: 'number.saj_discharge3_day_mask_input' },
        { startTime: 'text.saj_discharge4_start_time_time', endTime: 'text.saj_discharge4_end_time_time', power: 'number.saj_discharge4_power_percent_input', dayMask: 'number.saj_discharge4_day_mask_input' },
        { startTime: 'text.saj_discharge5_start_time_time', endTime: 'text.saj_discharge5_end_time_time', power: 'number.saj_discharge5_power_percent_input', dayMask: 'number.saj_discharge5_day_mask_input' },
        { startTime: 'text.saj_discharge6_start_time_time', endTime: 'text.saj_discharge6_end_time_time', power: 'number.saj_discharge6_power_percent_input', dayMask: 'number.saj_discharge6_day_mask_input' },
        { startTime: 'text.saj_discharge7_start_time_time', endTime: 'text.saj_discharge7_end_time_time', power: 'number.saj_discharge7_power_percent_input', dayMask: 'number.saj_discharge7_day_mask_input' }
      ],
      timeEnable:       'number.saj_discharge_time_enable_input',
      dischargingSwitch:'switch.saj_discharging_control'
    };
  }

  constructor() {
    super();
    // Attach Shadow DOM
    this.attachShadow({ mode: 'open' });

    // Initialize properties
    this._entities = JSON.parse(JSON.stringify(SajH2InverterCard.DEFAULT_ENTITIES)); // Start with defaults
    this._mode = 'both';
    this._hass = null;
    this._debug = false;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this._mode = config.mode || 'both';
    if (!['charge','discharge','both'].includes(this._mode)) {
      throw new Error(`Invalid mode: ${this._mode}. Must be one of: charge, discharge, both`);
    }

    // Deep merge user-provided entities with defaults
    this._entities = this._deepMerge(
        JSON.parse(JSON.stringify(SajH2InverterCard.DEFAULT_ENTITIES)), // Create a fresh copy of defaults
        config.entities || {} // Merge user config on top
    );

    this._debug = config.debug === true;

    // If hass is already set, trigger a re-render with the new config
    if (this.shadowRoot && this._hass) {
      this._renderCard();
    }
  }

  set hass(hass) {
    if (!hass) return;

    const shouldUpdate = this._shouldUpdate(hass);
    const userInteracting = this._isUserInteracting();

    this._hass = hass; // Always update internal hass state

    // Render only if necessary and safe
    if (this.shadowRoot && shouldUpdate && !userInteracting) {
        this._renderCard();
    }
  }

  // Check if the user is actively interacting with an input inside the Shadow DOM
  _isUserInteracting() {
    if (!this.shadowRoot) return false;
    const activeElement = this.shadowRoot.activeElement;
    return (
      activeElement &&
      /^(input|select|textarea|button)$/i.test(activeElement.tagName)
    );
  }

  // Determine if a re-render is needed based on relevant entity state changes
  _shouldUpdate(newHass) {
    if (!this._hass) return true; // Always render the first time hass is set

    // Create a flat list of all entity IDs used by the card based on current config
    const relevantEntityIds = [];
    if (this._mode !== 'discharge') {
        relevantEntityIds.push(
            this._entities.chargeStart,
            this._entities.chargeEnd,
            this._entities.chargeDayMask,
            this._entities.chargePower,
            this._entities.chargingSwitch
        );
    }
    if (this._mode !== 'charge') {
        relevantEntityIds.push(
            this._entities.timeEnable,
            this._entities.dischargingSwitch
        );
        this._entities.dischargeSlots.forEach(slot => {
            relevantEntityIds.push(slot.startTime, slot.endTime, slot.power, slot.dayMask);
        });
    }

    // Check if any relevant entity has changed state or pending_write status
    return relevantEntityIds.some(id => {
        if (!id) return false; // Skip if an entity ID is somehow undefined/null
        const oldState = this._hass.states[id];
        const newState = newHass.states[id];
        return (
            !oldState || // Entity is new
            !newState || // Entity was removed (should ideally not happen if config is static)
            oldState.state !== newState.state || // State value changed
            (oldState.attributes?.pending_write) !== (newState.attributes?.pending_write) // Pending status changed
        );
    });
  }

  // Main render function
  _renderCard() {
    if (!this._hass || !this.shadowRoot) return; // Ensure hass and shadowRoot are available
    if (this._isUserInteracting()) return; // Don't re-render if user is typing/clicking

    // --- Prepare Content ---
    let cardContent = '';
    let hasError = false;

    // Render Charging Section
    if (this._mode !== 'discharge') {
      const chargeResult = this._renderChargingSection();
      if (chargeResult.error) hasError = true;
      cardContent += chargeResult.html;
    }

    // Render Discharging Section
    if (this._mode !== 'charge') {
      const dischargeResult = this._renderDischargingSection();
       if (dischargeResult.error) hasError = true;
      cardContent += dischargeResult.html;
    }

    // Handle case where required entities for *any* section are missing
     if (hasError && !cardContent.includes('card-error')) {
         // Add a general error if specific errors weren't already rendered
         cardContent = `<ha-alert alert-type="error">Required entities missing. Please check card configuration and ensure entities exist.</ha-alert>` + cardContent;
     }


    // --- Render to Shadow DOM ---
    this.shadowRoot.innerHTML = `
      <style>
        ${this._getStyles()}
      </style>
      <ha-card>
        <div class="card-content">
          ${cardContent}
        </div>
      </ha-card>
    `;

    // Add event listeners after the DOM is updated
    this._addEventListeners();
  }

  // Render the charging section HTML
  _renderChargingSection() {
    const s = this._entities;
    const es = this._hass.states;
    const start = es[s.chargeStart], end = es[s.chargeEnd], mask = es[s.chargeDayMask], power = es[s.chargePower], sw = es[s.chargingSwitch];

    if (!start || !end || !mask || !power || !sw) {
      return { html: `<div class="card-error"><h2>Charging Entities Missing</h2><p>Check: ${s.chargeStart}, ${s.chargeEnd}, ${s.chargeDayMask}, ${s.chargePower}, ${s.chargingSwitch}</p></div>`, error: true };
    }

    const chargeStart = start.state;
    const chargeEnd = end.state;
    const chargeDayMask = parseInt(mask.state) || 0;
    const chargePower = parseInt(power.state) || 0;
    const chargingEnabled = sw.state === 'on';
    const pendingWrite = sw.attributes?.pending_write === true;

    const html = `
      <div class="section charging-section">
        <div class="section-header">Charging Settings</div>
        <div class="subsection">
          <div class="subsection-header">Charging Time & Power</div>
          <div class="time-power-container">
            <div class="time-power-row">
              ${this._renderTimeSelects('charge', chargeStart, chargeEnd, chargePower)}
            </div>
            <div class="slider-container">
              <input type="range" id="charge-power" class="power-slider" min="0" max="25" step="1" value="${chargePower}" ?disabled=${pendingWrite} />
            </div>
          </div>
        </div>
        <div class="subsection">
          <div class="subsection-header">Charging Days</div>
          <div class="days-selection">
            ${this._renderDayCheckboxes('charge', chargeDayMask, pendingWrite)}
          </div>
        </div>
        <div class="subsection">
          <div class="subsection-header">Charging Control</div>
          ${this._renderStatusButton(chargingEnabled, pendingWrite, 'charging')}
        </div>
      </div>`;
      return { html: html, error: false };
  }

  // Render the discharging section HTML
  _renderDischargingSection() {
    const switchEntityId = this._entities.dischargingSwitch;
    const timeEnableEntityId = this._entities.timeEnable;
    const sw = this._hass.states[switchEntityId];
    const timeEnableEntity = this._hass.states[timeEnableEntityId];

    if (!sw || !timeEnableEntity) {
       return { html: `<div class="card-error"><h2>Discharging Entities Missing</h2><p>Check: ${switchEntityId}, ${timeEnableEntityId}</p></div>`, error: true };
    }

    const dischargingEnabled = sw.state === 'on';
    const pendingWrite = sw.attributes?.pending_write === true;
    const timeEnableValue = parseInt(timeEnableEntity.state) || 0;
    let slotError = false;

    const slots = this._entities.dischargeSlots.map((slotConfig, i) => {
      const sStart = this._hass.states[slotConfig.startTime];
      const sEnd = this._hass.states[slotConfig.endTime];
      const sPower = this._hass.states[slotConfig.power];
      const sMask = this._hass.states[slotConfig.dayMask];
      const valid = sStart && sEnd && sPower && sMask;
      if (!valid) slotError = true; // Mark if any slot has missing entities
      return {
        index: i,
        valid,
        enabled: (timeEnableValue & (1 << i)) !== 0,
        startTime: valid ? sStart.state : '00:00',
        endTime:   valid ? sEnd.state : '00:00',
        power:    valid ? parseInt(sPower.state) || 0 : 0,
        dayMask:  valid ? parseInt(sMask.state) || 0 : 0,
        config: slotConfig // Keep original config for listeners
      };
    });

    let slotHtml = slots.map(s => this._renderDischargeSlot(s, pendingWrite)).join('');
    if (slotError) {
        slotHtml = `<ha-alert alert-type="warning">One or more discharge slots have missing entities. Please check configuration.</ha-alert>` + slotHtml;
    }


    const html = `
      <div class="section discharging-section">
        <div class="section-header">Discharging Settings</div>
        <div class="subsection">
          <div class="subsection-header">Discharging Control</div>
          ${this._renderStatusButton(dischargingEnabled, pendingWrite, 'discharging')}
        </div>
        <div class="subsection">
          <div class="subsection-header">Discharge Time Slots</div>
          <div class="discharge-slots">
            ${slotHtml}
          </div>
        </div>
      </div>`;
      return { html: html, error: false }; // Section itself is ok, slots might have warnings
  }

  // Render a single discharge slot HTML
  _renderDischargeSlot(slot, parentPendingWrite = false) {
    if (!slot.valid) {
        // Optionally render a placeholder or error for invalid slots
        return `<div class="discharge-slot invalid">Slot ${slot.index+1}: Entity configuration error</div>`;
    }
    const isDisabled = parentPendingWrite || (slot.enabled && this._hass.states[slot.config.startTime]?.attributes?.pending_write) ; // Disable if parent switch or relevant slot entity is pending

    return `
      <div class="discharge-slot ${slot.enabled ? 'enabled' : 'disabled'} ${isDisabled ? 'pending' : ''}">
        <div class="slot-header">
          <label class="slot-checkbox">
            <input type="checkbox" id="slot-${slot.index}-enabled" ${slot.enabled ? 'checked' : ''} ?disabled=${parentPendingWrite} />
            <span>Slot ${slot.index+1}</span>
          </label>
        </div>
        <div class="slot-content ${slot.enabled ? 'visible' : 'hidden'}">
          <div class="time-power-container">
            <div class="time-power-row">
              ${this._renderTimeSelects(`slot-${slot.index}`, slot.startTime, slot.endTime, slot.power)}
            </div>
            <div class="slider-container">
              <input type="range" id="slot-${slot.index}-power" class="power-slider" min="0" max="100" step="1" value="${slot.power}" ?disabled=${isDisabled || !slot.enabled} />
            </div>
          </div>
          <div class="days-select">
            ${this._renderDayCheckboxes(`slot-${slot.index}`, slot.dayMask, isDisabled || !slot.enabled)}
          </div>
        </div>
      </div>`;
  }

  // Render the time input elements
  _renderTimeSelects(prefix, startTime, endTime, power = null, disabled = false) {
     return `
    <div class="time-box-container">
      <div class="time-box start-time">
        <div class="time-box-label">Start</div>
        <div class="time-input-container">
          <input type="time" id="${prefix}-start-time" value="${startTime}" step="300" class="time-input" ?disabled=${disabled} />
        </div>
      </div>
      <div class="time-box end-time">
        <div class="time-box-label">End</div>
        <div class="time-input-container">
          <input type="time" id="${prefix}-end-time" value="${endTime}" step="300" class="time-input" ?disabled=${disabled} />
        </div>
      </div>
      <div class="time-box power-time">
        <div class="time-box-label">Power</div>
        <div class="power-placeholder">
          ${power !== null ? `<span class="power-value">${power}%</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  // Render day selection checkboxes
  _renderDayCheckboxes(prefix, mask, disabled = false) {
    const days = this._getDaysFromMask(mask);
    return ['Mo','Tu','We','Th','Fr','Sa','Su'].map((dayAbbr, i) => `
      <label class="day-checkbox ${disabled ? 'disabled' : ''}">
        <input type="checkbox" id="${prefix}-day-${dayAbbr.toLowerCase()}" data-day-index="${i}" ${days[['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][i]] ? 'checked' : ''} ?disabled=${disabled} />
        <span>${dayAbbr}</span>
      </label>`).join('');
  }

  // Render the main status button (Charge/Discharge enable/disable)
  _renderStatusButton(isEnabled, isPending, type) {
    const actionText = isEnabled ? `Disable ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Enable ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const statusText = isPending ? 'Pending...' : (isEnabled ? `${type.charAt(0).toUpperCase() + type.slice(1)} active` : `${type.charAt(0).toUpperCase() + type.slice(1)} inactive`);

    const button = `<button id="${type}-toggle" class="control-button ${isEnabled ? 'active' : ''}" ?disabled=${isPending}>${actionText}</button>`;
    const statusDisplay = `
        <div class="status-display">
            Status: <span class="status-value ${isEnabled ? 'active' : 'inactive'} ${isPending ? 'pending' : ''}">${statusText}</span>
            ${isPending ? '<div class="wait-message">Wait for update</div>' : ''}
        </div>`;

    return `${button}${statusDisplay}`;
  }


  // Add all event listeners after rendering
  _addEventListeners() {
    if (!this.shadowRoot) return;
    if (this._mode !== 'discharge') this._addChargingEventListeners();
    if (this._mode !== 'charge') this._addDischargingEventListeners();
  }

  // Add listeners for the charging section
  _addChargingEventListeners() {
    const q = sel => this.shadowRoot.querySelector(sel);
    const chargeSection = q('.charging-section');
    if (!chargeSection) return; // Section not rendered

    // Charge Toggle Button
    const toggle = q('#charging-toggle');
    if (toggle && !toggle.hasAttribute('data-listener-added')) {
      toggle.setAttribute('data-listener-added', 'true');
      toggle.addEventListener('click', () => {
        const entityId = this._entities.chargingSwitch;
        const currentState = this._hass.states[entityId]?.state;
        if (!currentState) return;
        const newState = currentState === 'on' ? 'off' : 'on';
        this._hass.callService('switch', `turn_${newState}`, { entity_id: entityId });
        // Visual feedback is handled by re-render on state change
      });
    }

    // Charge Time Inputs
    this._setupTimeListeners('charge', this._entities.chargeStart, this._entities.chargeEnd);

    // Charge Power Slider
    const slider = q('#charge-power');
    if (slider && !slider.hasAttribute('data-listener-added')) {
        slider.setAttribute('data-listener-added', 'true');
        const powerValueDisplay = chargeSection.querySelector('.power-value');
        slider.addEventListener('input', e => {
            if (powerValueDisplay) powerValueDisplay.textContent = `${e.target.value}%`;
        });
        slider.addEventListener('change', e => {
            this._setEntityValue(this._entities.chargePower, parseInt(e.target.value, 10), 'number');
        });
    }

    // Charge Day Checkboxes
    this._setupDayListeners('charge', this._entities.chargeDayMask);
  }

  // Add listeners for the discharging section
  _addDischargingEventListeners() {
    const q = sel => this.shadowRoot.querySelector(sel);
    const dischargeSection = q('.discharging-section');
    if (!dischargeSection) return; // Section not rendered

    // Discharge Toggle Button
    const toggle = q('#discharging-toggle');
    if (toggle && !toggle.hasAttribute('data-listener-added')) {
       toggle.setAttribute('data-listener-added', 'true');
      toggle.addEventListener('click', () => {
        const entityId = this._entities.dischargingSwitch;
        const currentState = this._hass.states[entityId]?.state;
        if (!currentState) return;
        const newState = currentState === 'on' ? 'off' : 'on';
        this._hass.callService('switch', `turn_${newState}`, { entity_id: entityId });
      });
    }

    // Discharge Slot Listeners
    const timeEnableEntityId = this._entities.timeEnable;
    this._entities.dischargeSlots.forEach((slotConfig, i) => {
      const slotElement = q(`.discharge-slot:has(#slot-${i}-enabled)`); // Find slot element reliably
      if (!slotElement) return; // Slot might be invalid or not rendered

      // Slot Enable Checkbox
      const chk = q(`#slot-${i}-enabled`);
      if (chk && !chk.hasAttribute('data-listener-added')) {
        chk.setAttribute('data-listener-added', 'true');
        chk.addEventListener('change', () => {
            const currentMask = parseInt(this._hass.states[timeEnableEntityId]?.state || '0');
            const bit = 1 << i;
            const newMask = chk.checked ? (currentMask | bit) : (currentMask & ~bit);
            this._setEntityValue(timeEnableEntityId, newMask, 'number');
            // Toggle visibility class immediately for responsiveness
            const content = slotElement.querySelector('.slot-content');
            if (content) {
                content.classList.toggle('hidden', !chk.checked);
                content.classList.toggle('visible', chk.checked);
            }
        });
      }

      // Slot Time Inputs
      this._setupTimeListeners(`slot-${i}`, slotConfig.startTime, slotConfig.endTime);

      // Slot Power Slider
      const slider = q(`#slot-${i}-power`);
      if (slider && !slider.hasAttribute('data-listener-added')) {
        slider.setAttribute('data-listener-added', 'true');
        const powerValueDisplay = slotElement.querySelector('.power-value');
        slider.addEventListener('input', e => {
          if (powerValueDisplay) powerValueDisplay.textContent = `${e.target.value}%`;
        });
        slider.addEventListener('change', e => {
          this._setEntityValue(slotConfig.power, parseInt(e.target.value, 10), 'number');
        });
      }

      // Slot Day Checkboxes
      this._setupDayListeners(`slot-${i}`, slotConfig.dayMask);
    });
  }

  // Helper to setup time input listeners
  _setupTimeListeners(prefix, startEntity, endEntity) {
    if (!this.shadowRoot) return;
    ['start', 'end'].forEach(type => {
      const input = this.shadowRoot.querySelector(`#${prefix}-${type}-time`);
      const entityId = type === 'start' ? startEntity : endEntity;
      if (input && !input.hasAttribute('data-listener-added')) {
        input.setAttribute('data-listener-added', 'true');
        input.addEventListener('change', e => {
            // Basic validation: ensure time is in HH:MM format
            if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(e.target.value)) {
                 this._setEntityValue(entityId, e.target.value, 'text');
            } else {
                // Optionally revert or show error if format is wrong
                console.warn(`Invalid time format entered for ${entityId}: ${e.target.value}`);
                // Revert to previous state value?
                const prevState = this._hass.states[entityId]?.state;
                if (prevState) e.target.value = prevState;
            }
        });
      }
    });
  }

  // Helper to setup day checkbox listeners
  _setupDayListeners(prefix, maskEntity) {
     if (!this.shadowRoot) return;
     const dayCheckboxes = this.shadowRoot.querySelectorAll(`input[type="checkbox"][id^="${prefix}-day-"]`);
     let listenerAttached = false;

     dayCheckboxes.forEach(chk => {
        if (!chk.hasAttribute('data-listener-added')) {
            listenerAttached = true; // Mark that we need to add the common change handler
            chk.setAttribute('data-listener-added', 'true');
        }
     });

     // Add one listener to the container of the checkboxes for efficiency if any new listeners were needed
     if (listenerAttached) {
        const container = dayCheckboxes[0]?.closest('.days-selection, .days-select');
        if (container) {
            container.addEventListener('change', (event) => {
                // Check if the change event originates from one of *our* checkboxes
                if (event.target.matches(`input[type="checkbox"][id^="${prefix}-day-"]`)) {
                    let newMask = 0;
                    this.shadowRoot.querySelectorAll(`input[type="checkbox"][id^="${prefix}-day-"]`).forEach(cb => {
                        if (cb.checked) {
                            const dayIndex = parseInt(cb.dataset.dayIndex, 10);
                            if (!isNaN(dayIndex)) {
                                newMask |= (1 << dayIndex);
                            }
                        }
                    });
                    this._setEntityValue(maskEntity, newMask, 'number');
                }
            });
        }
     }
  }


  // Call HA service to set entity value
  _setEntityValue(entityId, value, domain = 'text') {
    if (!this._hass || !entityId) return;
    this._hass.callService(domain, 'set_value', { entity_id: entityId, value: value })
      .then(() => {
        this._debug && console.log(`Successfully set ${entityId} to ${value}`);
      })
      .catch(err => {
        console.error(`Error setting ${entityId} to ${value}:`, err);
        // Optionally show an error to the user in the UI
      });
  }

  // Calculate bitmask from day selection object
  _calculateDaymask(days) {
    // Ensure days object exists and has boolean values
    const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    return dayKeys.reduce((sum, day, i) => sum + ((days && days[day]) ? (1 << i) : 0), 0);
  }


  // Get day selection object from bitmask
  _getDaysFromMask(mask) {
    const days = {};
    ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach((day, i) => {
      days[day] = (mask & (1 << i)) !== 0;
    });
    return days;
  }

  // Calculate the card size for Lovelace layout
  getCardSize() {
    let size = 1; // Base size for card wrapper
    if (this._mode !== 'discharge') {
      size += 3; // Approx size for charging section (time, days, control)
    }
    if (this._mode !== 'charge') {
      size += 2; // Approx size for discharging section header + control
      // Add size for visible discharge slots (approx 1 unit per 2 slots)
      if (this._hass && this._entities.timeEnable) {
          const timeEnableValue = parseInt(this._hass.states[this._entities.timeEnable]?.state || '0');
          const enabledSlots = this._entities.dischargeSlots.filter((slot, i) => (timeEnableValue & (1 << i)) !== 0).length;
          size += Math.ceil(enabledSlots / 2);
      } else {
           size += Math.ceil(this._entities.dischargeSlots.length / 2); // Estimate based on total slots if state unknown
      }
    }
    return Math.max(1, size); // Ensure minimum size of 1
  }

  // Runs when the element is added to the DOM
  connectedCallback() {
    // Trigger initial render if hass was already set before connection
     if (this.shadowRoot && this._hass) {
        this._renderCard();
     }
    // Polyfills (less critical now, but kept for completeness)
    if (!Element.prototype.matches) {
      Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
    if (!Element.prototype.closest) {
      Element.prototype.closest = function(s) {
        let el = this;
        do {
          if (el.matches(s)) return el;
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
      };
    }
  }

  // Runs when the element is removed from the DOM
  disconnectedCallback() {
    // Clean up any global listeners if they were added (none in this version)
  }

  // Helper function for deep merging configuration objects
  _deepMerge(target, source) {
      const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);

      if (!isObject(target) || !isObject(source)) {
          return source; // Overwrite if not both objects, or if target is not an object
      }

      const output = { ...target }; // Start with a shallow copy of the target

      Object.keys(source).forEach(key => {
          const targetValue = output[key];
          const sourceValue = source[key];

          if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
              // Simple array replacement strategy - user's array overrides default
              output[key] = sourceValue;
              // If merging array *contents* is needed, logic would be more complex here
          } else if (isObject(targetValue) && isObject(sourceValue)) {
              // Recursively merge nested objects
              output[key] = this._deepMerge(targetValue, sourceValue);
          } else {
              // Overwrite target value with source value for primitives or different types
              output[key] = sourceValue;
          }
      });

      return output;
  }


  // Static method to return the CSS styles
  _getStyles() {
    return `
      :host { /* Style the <saj-h2-inverter-card> element itself */
        display: block;
        --slider-track-color: var(--input-fill-color, #F0F0F0); /* Default light grey */
        --slider-thumb-color: var(--paper-slider-knob-color, var(--primary-color));
        --slider-active-color: var(--paper-slider-active-color, var(--primary-color));
      }
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .card-content {
        padding: 16px;
        flex-grow: 1;
      }
      .card-error {
        background-color: var(--error-color);
        color: var(--text-primary-color-on-error, white);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      .card-error h2 {
        margin: 0 0 8px 0;
        font-size: 1.1em;
      }
      .card-error p {
        margin: 0;
        font-size: 0.9em;
        word-break: break-all;
      }
      ha-alert {
        display: block;
        margin-bottom: 16px;
      }
      .section { margin-bottom: 24px; }
      .charging-section, .discharging-section {
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 16px;
        background-color: var(--card-background-color);
      }
      .section-header {
        font-size: 1.25rem;
        font-weight: 500;
        margin: -16px -16px 16px -16px; /* Extend to edges */
        padding: 12px 16px; /* Add padding back */
        color: var(--primary-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: rgba(var(--rgb-primary-color), 0.05); /* Subtle background */
        border-radius: 12px 12px 0 0; /* Match card rounding */
        letter-spacing: 0.5px;
      }
      .subsection { margin-bottom: 20px; }
      .subsection:last-child { margin-bottom: 0; }
      .subsection-header { font-size: 1.1rem; font-weight: 500; margin-bottom: 12px; color: var(--primary-text-color); }

      .time-box-container {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        width: 100%; /* Use full width */
        background-color: var(--secondary-background-color);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        gap: 16px; /* Use gap for spacing */
        box-sizing: border-box;
      }
      .time-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1; /* Allow boxes to grow and shrink */
        min-width: 80px; /* Prevent excessive shrinking */
      }
      .power-time {
        flex: 0 1 auto; /* Don't grow power box as much */
        min-width: 60px;
      }

      .time-box-label {
        font-size: 0.9em; font-weight: 500; margin-bottom: 6px;
        color: var(--secondary-text-color); text-transform: uppercase;
        letter-spacing: 0.5px; white-space: nowrap;
      }
      .time-input-container {
        display: flex;
        align-items: center;
        border: 1px solid var(--input-ink-color, var(--divider-color));
        border-radius: 8px;
        padding: 4px 6px;
        background-color: var(--input-fill-color, var(--card-background-color));
        width: 100%;
        box-sizing: border-box;
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      .time-input-container:hover {
         border-color: var(--input-hover-ink-color, var(--primary-color));
      }
      .time-input {
        flex-grow: 1;
        padding: 8px 4px;
        border: none;
        background-color: transparent;
        color: var(--primary-text-color);
        font-size: 1.1em;
        font-weight: 500;
        text-align: center;
        min-width: 80px; /* Ensure enough space for HH:MM */
        outline: none;
        color-scheme: light dark; /* Allow browser native controls to theme */
      }
       .time-input:disabled {
         color: var(--disabled-text-color);
         cursor: not-allowed;
       }
       .time-input-container:has(input:disabled) {
          background-color: var(--input-disabled-fill-color, var(--disabled-background-color, #EEEEEE));
          border-color: var(--input-disabled-ink-color, var(--divider-color));
       }


        /* Styling for the Power Value placeholder to give it a border */
      .power-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        /* Removed min-height, let content + padding define height */
        padding: 0; /* Reset padding, apply to inner span */
        width: 100%; /* Take available space within its flex container */
        box-sizing: border-box;
      }
/* Styling for the Power Value SPAN itself */
       .power-value {
         display: inline-flex; /* Use flex to center content vertically */
         align-items: center; /* Center text vertically */
         justify-content: center; /* Center text horizontally */
         padding: 11px 12px; /* Adjust padding as needed, keep vertical reasonable */
         border: 1px solid var(--input-ink-color, var(--divider-color));
         border-radius: 8px; /* Match time-input-container */
         background-color: var(--input-fill-color, var(--card-background-color)); /* Match time-input-container */
         font-size: 1.1em; /* Match font-size of time-input */
         font-weight: 500;
         color: var(--primary-text-color);
         min-width: 60px; /* Ensure minimum width */
         min-height: 40px; /* <<-- KEY CHANGE: Set minimum height to match input box */
         box-sizing: border-box; /* IMPORTANT: Include padding and border in height */
         text-align: center;
         /* line-height: normal; Removed, flex alignment handles vertical centering */
       }


/* Adjusted gap for weekdays */
      .days-selection, .days-select {
        display: flex; flex-wrap: wrap;
        /* Reduced column gap (second value) */
        gap: 0px 0px; /* Row gap, Column gap */
        margin-bottom: 12px; justify-content: flex-start;
      }
      .day-checkbox {
        display: flex; align-items: center; gap: 0px; cursor: pointer;
        padding: 4px 8px; border-radius: 12px; transition: background-color 0.2s ease;
      }
      .day-checkbox:not(.disabled):hover {
         background-color: rgba(var(--rgb-primary-color), 0.1);
      }
      .day-checkbox span { font-size: 1em; user-select: none;}
      .day-checkbox input[type="checkbox"] {
        width: 18px; height: 18px; margin-right: 4px; cursor: pointer; accent-color: var(--primary-color);
      }
       .day-checkbox input[type="checkbox"]:disabled {
         cursor: not-allowed;
         accent-color: var(--disabled-text-color);
       }
       .day-checkbox.disabled {
          cursor: not-allowed;
          color: var(--disabled-text-color);
       }
       .day-checkbox.disabled span {
           /* Optional: style disabled text */
           /* text-decoration: line-through; */
       }


      .time-power-container { display: flex; flex-direction: column; margin-bottom: 12px; }
      .time-power-row { display: flex; align-items: center; justify-content: flex-start; gap: 16px; margin-bottom: 12px; }
      .slider-container { width: 100%; padding: 0 8px; box-sizing: border-box; margin-top: 8px;}
       .power-slider {
           width: 100%;
           height: 8px;
           cursor: pointer;
           appearance: none;
           background: var(--slider-track-color);
           border-radius: 4px;
           outline: none;
           transition: background .2s ease-in-out;
           margin: 8px 0;
       }
        .power-slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            background: var(--slider-thumb-color);
            border-radius: 50%;
            cursor: pointer;
        }
        .power-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: var(--slider-thumb-color);
            border-radius: 50%;
            cursor: pointer;
            border: none; /* Reset border */
        }
       /* Active track styling (limited cross-browser support without complex overlays) */
        .power-slider:active::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(var(--rgb-primary-color), 0.2); }
        .power-slider:active::-moz-range-thumb { box-shadow: 0 0 0 4px rgba(var(--rgb-primary-color), 0.2); }
        /* Disabled state */
         .power-slider:disabled {
             background: var(--input-disabled-fill-color, #E0E0E0);
             cursor: not-allowed;
         }
         .power-slider:disabled::-webkit-slider-thumb { background: var(--disabled-text-color); cursor: not-allowed; }
         .power-slider:disabled::-moz-range-thumb { background: var(--disabled-text-color); cursor: not-allowed; }


      .control-button {
        width: 100%; padding: 14px; font-size: 1.1rem; border-radius: 8px; border: none;
        background-color: var(--primary-color); color: var(--text-primary-color-on-primary, white);
        font-weight: 500; cursor: pointer; margin-bottom: 10px;
        transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .control-button:hover:not(:disabled) {
        filter: brightness(110%);
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      }
      .control-button:active:not(:disabled) { transform: scale(0.98); }
      .control-button.active { background-color: var(--error-color); }
      .control-button.active:hover:not(:disabled) { background-color: var(--error-color); filter: brightness(110%); }
      .control-button:disabled {
          background-color: var(--disabled-text-color);
          cursor: not-allowed;
          box-shadow: none;
          filter: grayscale(50%);
      }

      .status-display {
          text-align: center;
          font-size: 0.95em;
          color: var(--secondary-text-color);
      }
      .status-value { font-weight: 500; }
      .status-value.active { color: var(--success-color, MediumSeaGreen); }
      .status-value.inactive { color: var(--error-color, Tomato); }
      .status-value.pending { color: var(--warning-color, Orange); }

      .wait-message {
        font-weight: 500; color: var(--warning-color); padding: 6px 0 0 0;
        text-align: center; font-size: 0.9em;
        animation: pulse 1.5s infinite ease-in-out;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }

      .discharge-slot {
        padding: 5px; border-radius: 8px; background-color: var(--secondary-background-color);
        border-left: 5px solid var(--disabled-text-color); /* Default to disabled color */
        margin-bottom: 12px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        transition: border-left-color 0.3s ease;
        box-sizing: border-box;
      }
      .discharge-slot.enabled { border-left-color: var(--primary-color); }
      .discharge-slot.invalid {
          border-left-color: var(--error-color);
          background-color: rgba(var(--rgb-error-color), 0.1);
          color: var(--error-color); font-weight: 500;
      }
       .discharge-slot.pending {
           opacity: 0.7;
           pointer-events: none; /* Disable interactions on the whole slot when pending */
       }
       .discharge-slot.pending .slot-header label {
           cursor: not-allowed; /* Indicate disabled state on header */
       }

      .slot-header { cursor: pointer; padding-bottom: 8px; }
      .slot-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; width: fit-content;}
      .slot-checkbox input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer; }
       .slot-checkbox input[type="checkbox"]:disabled { cursor: not-allowed; accent-color: var(--disabled-text-color); }
      .slot-checkbox span { font-size: 1.1em; font-weight: 500; user-select: none; }

      .slot-content {
        margin-top: 12px; overflow: hidden;
        transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out;
        max-height: 0; opacity: 0;
      }
      .slot-content.visible { max-height: 500px; /* Adjust if content can be taller */ opacity: 1; }
      .slot-content.hidden { margin-top: 0; }

      /* Responsive adjustments */
      @media (max-width: 450px) {
        .card-content { padding: 12px; }
        .section-header { font-size: 1.15rem; padding: 10px 12px;}
        .subsection-header { font-size: 1.05rem; }
        .time-box-container {
          flex-direction: column;
          align-items: stretch;
          padding: 12px;
          gap: 12px;
        }
        .time-box { width: 100%; align-items: center; }
        .power-time { align-items: center; }
        .time-input { font-size: 1.05em; }
        .power-value { font-size: 1.05em; }
        .days-selection, .days-select { justify-content: center; gap: 8px 10px; }
        .day-checkbox span { font-size: 0.95em; }
        .discharge-slot { padding: 12px; width: 100%; }
        .slot-checkbox span { font-size: 1.05em; }
        .control-button { font-size: 1rem; padding: 12px; }
      }
    `;
  }
}

// Register the custom element
customElements.define('saj-h2-inverter-card', SajH2InverterCard);

// Add card to custom card list for UI editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'saj-h2-inverter-card',
  name: 'SAJ H2 Inverter Card',
  description: 'Card for controlling SAJ H2 inverter charge/discharge settings.',
  preview: true, // Optional: Enables a visual preview in the card picker
  documentationURL: 'https://github.com/stanu74/saj-h2-ha-card' // Optional: Add your repo URL here
});