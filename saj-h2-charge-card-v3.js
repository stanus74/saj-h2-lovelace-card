class SajH2ChargeCardV3 extends HTMLElement {
  constructor() {
    super();
    this._entities = {
      chargeStart: null,
      chargeEnd: null,
      chargeDayMask: null,
      chargePower: null,
      chargingSwitch: null
    };
    this._hass = null;
    this._debug = false;
  }

  setConfig(config) {
    if (!config.charge_start_entity || !config.charge_end_entity ||
        !config.charge_day_mask_entity || !config.charge_power_entity ||
        !config.charging_switch_entity) {
      throw new Error('All required entities must be specified.');
    }
    this._entities.chargeStart = config.charge_start_entity;
    this._entities.chargeEnd = config.charge_end_entity;
    this._entities.chargeDayMask = config.charge_day_mask_entity;
    this._entities.chargePower = config.charge_power_entity;
    this._entities.chargingSwitch = config.charging_switch_entity;
    this._initCard();
  }

  _initCard() {
    if (this._content) {
      this.removeChild(this._content);
    }
    this._content = document.createElement('div');
    this._content.className = 'saj-h2-charge-card';
    this.appendChild(this._content);
    if (this._hass) {
      this._renderCard();
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._renderCard();
  }

  _renderCard() {
    if (!this._hass) return;
    const s = this._entities;
    const es = this._hass.states;
    const start = es[s.chargeStart], end = es[s.chargeEnd], mask = es[s.chargeDayMask], power = es[s.chargePower], sw = es[s.chargingSwitch];
    if (!start || !end || !mask || !power || !sw) {
      this._content.innerHTML = '<div class="card-error"><h2>Entity not found</h2><p>Please check the configuration.</p></div>';
      return;
    }
    const chargeStart = start.state;
    const chargeEnd = end.state;
    const chargeDayMask = parseInt(mask.state) || 0;
    const chargePower = parseInt(power.state) || 0;
    const chargingEnabled = sw.state === 'on';
    const days = this._getDaysFromMask(chargeDayMask);

    this._content.innerHTML = `
      <ha-card>
        <div class="card-content">
          <div class="section">
            <div class="section-header">Charging Time</div>
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
          <div class="section">
            <div class="section-header">Charging Power <span class="power-value">${chargePower}%</span></div>
            <div class="slider-container">
              <input type="range" id="charge-power" min="0" max="25" step="1" value="${chargePower}" />
            </div>
          </div>
          <div class="section">
            <div class="section-header">Charging Days</div>
            <div class="days-selection">
              ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                const short = day.slice(0,2);
                return `<label class="day-checkbox"><input type="checkbox" id="day-${day}" ${days[day] ? 'checked' : ''} /><span>${short.charAt(0).toUpperCase()+short.charAt(1)}</span></label>`;
              }).join('')}
            </div>
            
          </div>
          <div class="section">
            <div class="section-header">Charging Control</div>
            <button class="charge-toggle-button ${chargingEnabled ? 'active' : ''}" id="charge-toggle">
              ${chargingEnabled ? 'Disable Charging' : 'Enable Charging'}
            </button>
            <div class="charge-status">Status: <span class="${chargingEnabled ? 'active' : 'inactive'}">${chargingEnabled ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>
      </ha-card>`;
    this._addEventListeners();
  }

  _addEventListeners() {
    const q = id => this._content.querySelector(id);
    const getVal = (h, m) => `${h.value.padStart(2, '0')}:${m.value.padStart(2, '0')}`;

    q('#charge-start-hour').addEventListener('change', () => this._setTimeEntity(this._entities.chargeStart, getVal(q('#charge-start-hour'), q('#charge-start-minute'))));
    q('#charge-start-minute').addEventListener('change', () => this._setTimeEntity(this._entities.chargeStart, getVal(q('#charge-start-hour'), q('#charge-start-minute'))));
    q('#charge-end-hour').addEventListener('change', () => this._setTimeEntity(this._entities.chargeEnd, getVal(q('#charge-end-hour'), q('#charge-end-minute'))));
    q('#charge-end-minute').addEventListener('change', () => this._setTimeEntity(this._entities.chargeEnd, getVal(q('#charge-end-hour'), q('#charge-end-minute'))));

    q('#charge-power').addEventListener('input', e => q('.power-value').textContent = `${e.target.value}%`);
    q('#charge-power').addEventListener('change', e => this._setNumberEntity(this._entities.chargePower, parseInt(e.target.value)));

    ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(day => {
      q(`#day-${day}`).addEventListener('change', () => {
        const days = {};
        ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach(d => days[d] = q(`#day-${d}`).checked);
        const mask = this._calculateDaymask(days);
        
        this._setNumberEntity(this._entities.chargeDayMask, mask);
      });
    });

    q('#charge-toggle').addEventListener('click', () => {
      const sw = this._hass.states[this._entities.chargingSwitch];
      if (!sw) return;
      const state = sw.state === 'on' ? 'off' : 'on';
      this._hass.callService('switch', `turn_${state}`, { entity_id: this._entities.chargingSwitch });
    });
  }

  _calculateDaymask(days) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((sum, d, i) => sum + (days[d] ? 1 << i : 0), 0);
  }

  _getDaysFromMask(mask) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((obj, d, i) => (obj[d] = (mask & (1 << i)) !== 0, obj), {});
  }

  _generateHourOptions(timeString) {
    const hour = this._getHourFromTimeString(timeString);
    return Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i === hour ? 'selected' : ''}>${i}</option>`).join('');
  }

  _generateMinuteOptions(timeString) {
    const minute = this._getMinuteFromTimeString(timeString);
    return Array.from({ length: 60 }, (_, i) => `<option value="${i}" ${i === minute ? 'selected' : ''}>${i}</option>`).join('');
  }

  _getHourFromTimeString(timeString) {
    return timeString?.split(':')[0] | 0;
  }

  _getMinuteFromTimeString(timeString) {
    return timeString?.split(':')[1] | 0;
  }

  _setTimeEntity(entityId, value) {
    try {
      this._hass.callService('text', 'set_value', { entity_id: entityId, value });
    } catch (e) {
      console.error(`Error setting ${entityId}:`, e);
    }
  }

  _setNumberEntity(entityId, value) {
    try {
      this._hass.callService('number', 'set_value', { entity_id: entityId, value });
    } catch (e) {
      console.error(`Error setting ${entityId}:`, e);
    }
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    const style = document.createElement('style');
    style.textContent = `
      .saj-h2-charge-card {
        padding: 16px;
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
      }

      .time-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .time-label {
        font-weight: 500;
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

      .slider-container {
        display: flex;
        align-items: center;
      }

      input[type="range"] {
        width: 100%;
      }

      .power-value {
        margin-left: 10px;
        font-weight: bold;
      }

      .days-selection {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding-left: 2.2rem;
      }

      .day-checkbox {
        font-size: 8px;
        padding: 0.05rem 0.2rem;
        border-radius: 3px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        line-height: 1.1;
        cursor: pointer;
      }

      .day-checkbox input {
        margin-right: 2px;
      }

      .charge-toggle-button {
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

      .charge-toggle-button.active {
        background-color: var(--error-color);
      }

      .charge-status {
        text-align: center;
      }

      .charge-status .active {
        color: var(--success-color);
        font-weight: 500;
      }

      .charge-status .inactive {
        color: var(--error-color);
      }

      .card-error {
        padding: 16px;
        color: var(--error-color);
      }
    `;
    this.appendChild(style);
  }
}

customElements.define('saj-h2-charge-card-v3', SajH2ChargeCardV3);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'saj-h2-charge-card-v3',
  name: 'SAJ H2 Charge Card V3',
  description: 'Card for controlling charging settings for SAJ H2 inverters (Version 3)'
});
