/**
 * SAJ H2 Inverter Card
 * Custom card for Home Assistant to control SAJ H2 Inverter charging and discharging settings
 *
 * @author stanu74  
 * @version 1.0.4
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
    this._entities = JSON.parse(JSON.stringify(SajH2InverterCard.DEFAULT_ENTITIES));
    this._mode = 'both';
    this._hass = null;
    this._debug = false;
  }

  setConfig(config) {
    this._mode = config.mode || 'both';
    if (!['charge','discharge','both'].includes(this._mode)) {
      throw new Error(`Invalid mode: ${this._mode}. Must be one of: charge, discharge, both`);
    }
    this._initCard();
  }

  _initCard() {
    if (this._content) this.removeChild(this._content);
    this._content = document.createElement('div');
    this._content.className = 'saj-h2-inverter-card';
    this.appendChild(this._content);
    if (this._hass) this._renderCard();
  }

  set hass(hass) {
    if (this._shouldUpdate(hass) && !this._isUserInteracting()) {
      this._hass = hass;
      this._renderCard();
    } else {
      this._hass = hass;
    }
  }

  _isUserInteracting() {
    const active = document.activeElement;
    return (
      active &&
      this._content &&
      this._content.contains(active) &&
      /^(input|select|textarea|button)$/i.test(active.tagName)
    );
  }

  _shouldUpdate(newHass) {
    if (!this._hass) return true;
    const base = [
      this._entities.chargeStart,
      this._entities.chargeEnd,
      this._entities.chargeDayMask,
      this._entities.chargePower,
      this._entities.chargingSwitch,
      this._entities.timeEnable,
      this._entities.dischargingSwitch
    ];
    const dischargeIds = this._entities.dischargeSlots.reduce((arr, slot) =>
      arr.concat([slot.startTime, slot.endTime, slot.power, slot.dayMask]),
      []
    );
    const relevant = base.concat(dischargeIds);
    return relevant.some(id => {
      const oldS = this._hass.states[id];
      const newS = newHass.states[id];
      return (
        !oldS || !newS ||
        oldS.state !== newS.state ||
        (oldS.attributes?.pending_write) !== (newS.attributes?.pending_write)
      );
    });
  }

  _renderCard() {
    if (!this._hass) return;
    if (this._isUserInteracting()) return;

    const scroll = this._content.scrollTop;
    let html = '<ha-card><div class="card-content">';
    if (this._mode !== 'discharge') html += this._renderChargingSection();
    if (this._mode !== 'charge')    html += this._renderDischargingSection();
    html += '</div></ha-card>';

    this._content.innerHTML = html;
    this._content.scrollTop = scroll;
    this._addEventListeners();
  }

  _renderChargingSection() {
    const s = this._entities;
    const es = this._hass.states;
    const start = es[s.chargeStart], end = es[s.chargeEnd], mask = es[s.chargeDayMask], power = es[s.chargePower], sw = es[s.chargingSwitch];
    if (!start || !end || !mask || !power || !sw) {
      return `<div class="card-error"><h2>Charging entity not found</h2><p>Please check config.</p></div>`;
    }
    const chargeStart = start.state;
    const chargeEnd = end.state;
    const chargeDayMask = parseInt(mask.state) || 0;
    const chargePower = parseInt(power.state) || 0;
    const chargingEnabled = sw.state === 'on';
    const pendingWrite = sw.attributes?.pending_write === true;
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
      </div>`;
  }

  _renderDischargingSection() {
    const switchEntity = 'switch.saj_discharging_control';
    const sw = this._hass.states[switchEntity] || this._hass.states[this._entities.dischargingSwitch];
    const timeEnableEntity = this._hass.states[this._entities.timeEnable];
    if (!sw || !timeEnableEntity) {
      return `<div class="card-error"><h2>Discharging entity not found</h2><p>Please check config.</p></div>`;
    }
    const dischargingEnabled = sw.state === 'on';
    const pendingWrite = sw.attributes?.pending_write === true;
    const timeEnableValue = parseInt(timeEnableEntity.state) || 0;
    const slots = this._entities.dischargeSlots.map((slot, i) => {
      const sStart = this._hass.states[slot.startTime];
      const sEnd = this._hass.states[slot.endTime];
      const sPower = this._hass.states[slot.power];
      const sMask = this._hass.states[slot.dayMask];
      const valid = sStart && sEnd && sPower && sMask;
      return {
        index: i,
        valid,
        enabled: (timeEnableValue & (1 << i)) !== 0,
        startTime: valid ? sStart.state : '00:00',
        endTime:   valid ? sEnd.state : '00:00',
        power:    valid ? parseInt(sPower.state) || 0 : 0,
        dayMask:  valid ? parseInt(sMask.state) || 0 : 0
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
            ${slots.map(s => this._renderDischargeSlot(s)).join('')}
          </div>
        </div>
      </div>`;
  }

  _renderDischargeSlot(slot) {
    if (!slot.valid) return '';
    const days = this._getDaysFromMask(slot.dayMask);
    return `
      <div class="discharge-slot ${slot.enabled ? 'enabled' : 'disabled'}">
        <div class="slot-header">
          <label class="slot-checkbox">
            <input type="checkbox" id="slot-${slot.index}-enabled" ${slot.enabled ? 'checked' : ''} />
            <span>Slot ${slot.index+1}</span>
          </label>
        </div>
        <div class="slot-content ${slot.enabled ? 'visible' : 'hidden'}">
          <div class="time-power-container">
            <div class="time-power-row">
              ${this._renderTimeSelects(`slot-${slot.index}`, slot.startTime, slot.endTime, slot.power)}
            </div>
            <div class="slider-container">
              <input type="range" id="slot-${slot.index}-power" class="power-slider" min="0" max="100" step="1" value="${slot.power}" />
            </div>
          </div>
          <div class="days-select">
            ${this._renderDayCheckboxes(`slot-${slot.index}`, slot.dayMask)}
          </div>
        </div>
      </div>`;
  }

  _addEventListeners() {
    if (this._mode !== 'discharge') this._addChargingEventListeners();
    if (this._mode !== 'charge')    this._addDischargingEventListeners();
  }

  _addChargingEventListeners() {
    const q = sel => this._content.querySelector(sel);
    const toggle = q('#charging-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const sw = this._hass.states[this._entities.chargingSwitch];
        if (!sw) return;
        const status = q('.charging-section .status-display');
        const orig = status.innerHTML;
        status.innerHTML = '<div class="wait-message">Wait for modbus transfer</div>';
        setTimeout(() => status.innerHTML = orig, 2000);
        const newState = sw.state==='on'?'off':'on';
        this._hass.callService('switch', `turn_${newState}`, {entity_id: this._entities.chargingSwitch});
      });
    }
    this._setupTimeListeners('charge', this._entities.chargeStart, this._entities.chargeEnd);
    const slider = q('#charge-power');
    if (slider) {
      slider.addEventListener('input', e => q('.power-value').textContent = `${e.target.value}%`);
      slider.addEventListener('change', e => this._setEntityValue(this._entities.chargePower, parseInt(e.target.value), 'number'));
    }
    this._setupDayListeners('charge', this._entities.chargeDayMask);
  }

  _addDischargingEventListeners() {
    const q = sel => this._content.querySelector(sel);
    const toggle = q('#discharging-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const entity = 'switch.saj_discharging_control';
        const sw = this._hass.states[entity] || this._hass.states[this._entities.dischargingSwitch];
        if (!sw) return;
        const status = q('.discharging-section .status-display');
        const orig = status.innerHTML;
        status.innerHTML = '<div class="wait-message">Wait for modbus transfer</div>';
        setTimeout(() => status.innerHTML = orig, 2000);
        const newState = sw.state==='on'?'off':'on';
        this._hass.callService('switch', `turn_${newState}`, {entity_id: entity});
      });
    }
    const timeEnable = this._hass.states[this._entities.timeEnable];
    let value = parseInt(timeEnable?.state) || 0;
    this._entities.dischargeSlots.forEach((slot,i) => {
      const chk = q(`#slot-${i}-enabled`);
      if (chk) chk.addEventListener('change', () => {
        const bit = 1<<i;
        if (chk.checked) value |= bit; else value &= ~bit;
        this._setEntityValue(this._entities.timeEnable, value, 'number');
        const content = chk.closest('.discharge-slot').querySelector('.slot-content');
        content.classList.toggle('hidden', !chk.checked);
        content.classList.toggle('visible', chk.checked);
      });
      this._setupTimeListeners(`slot-${i}`, slot.startTime, slot.endTime);
      const slider = q(`#slot-${i}-power`);
      if (slider) {
        slider.addEventListener('input', e => {
          const pv = q(`.discharge-slot:nth-child(${i+1}) .power-value`);
          if (pv) pv.textContent = `${e.target.value}%`;
        });
        slider.addEventListener('change', e => this._setEntityValue(slot.power, parseInt(e.target.value), 'number'));
      }
      this._setupDayListeners(`slot-${i}`, slot.dayMask);
    });
  }

  _generateTimeOptions(type, sel) {
    const max = type==='hour'?24:60;
    return Array.from({length:max},(_,i)=>(`<option value="${i}" ${i===sel?'selected':''}>${i.toString().padStart(2,'0')}</option>`)).join('');
  }

  _parseTime(str) {
    const [h='0',m='0']= (str||'00:00').split(':');
    return {hour:parseInt(h)||0, minute:parseInt(m)||0};
  }

  _setEntityValue(id,val,type='text') {
    try { this._hass.callService(type,'set_value',{entity_id:id,value:val});
      this._debug && console.log(`Set ${id} to ${val}`);
    } catch(e){ console.error(`Error setting ${id}:`,e); }
  }

  _renderTimeSelects(pref,start,end,power=null) {
    return `
    <div class="time-box-container">
      <div class="time-box start-time">
        <div class="time-box-label">Start</div>
        <div class="time-input-container">
          <input type="time" id="${pref}-start-time" value="${start}" step="300" class="time-input" />
        </div>
      </div>
      <div class="time-box end-time">
        <div class="time-box-label">End</div>
        <div class="time-input-container">
          <input type="time" id="${pref}-end-time" value="${end}" step="300" class="time-input" />
        </div>
      </div>
      <div class="time-box power-time">
        <div class="time-box-label">Power</div>
        <div class="power-placeholder">
          ${power!==null?`<span class="power-value">${power}%</span>`:''}
        </div>
      </div>
    </div>`;
  }

  _renderDayCheckboxes(pref,mask) {
    const days = this._getDaysFromMask(mask);
    return ['Mo','Tu','We','Th','Fr','Sa','Su'].map((d,i)=>`
      <label class="day-checkbox">
        <input type="checkbox" id="${pref}-day-${d.toLowerCase()}" ${Object.values(days)[i]?'checked':''} />
        <span>${d}</span>
      </label>`).join('');
  }

  _renderStatusButton(en,p,type) {
    const txt = p? 'Pending write...' : (en? (type==='charging'? 'Charging active':'Discharging active'):(type==='charging'? 'Charging inactive':'Discharging inactive'));
    const btn = `<button id="${type}-toggle" class="control-button ${en?'active':''}">${en?(type==='charging'?'Disable Charging':'Disable Discharging'):(type==='charging'?'Enable Charging':'Enable Discharging')}</button>`;
    return `${btn}<div class="status-display">Status: <span class="status-value ${en?'active':'inactive'}">${txt}</span>${p?'<div class="wait-message">Wait for modbus transfer</div>':''}</div>`;
  }

  _setupDayListeners(pref,entity) {
    ['mo','tu','we','th','fr','sa','su'].forEach((d,i)=>{
      const chk = this._content.querySelector(`#${pref}-day-${d}`);
      if (chk) chk.addEventListener('change',()=>{
        const sel = {};
        ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach((day,j)=>sel[day]=this._content.querySelector(`#${pref}-day-${['mo','tu','we','th','fr','sa','su'][j]}`).checked);
        this._setEntityValue(entity,this._calculateDaymask(sel),'number');
      });
    });
  }

  _setupTimeListeners(pref,startEnt,endEnt) {
    ['start','end'].forEach(type=>{
      const inp = this._content.querySelector(`#${pref}-${type}-time`);
      const ent = type==='start'? startEnt: endEnt;
      if (inp) inp.addEventListener('change',e=>this._setEntityValue(ent,e.target.value));
    });
  }

  _calculateDaymask(days) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((sum,day,i)=>sum + (days[day]?1<<i:0),0);
  }

  _getDaysFromMask(mask) {
    return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .reduce((obj,day,i)=>(obj[day]=(mask&(1<<i))!==0,obj),{});
  }

  getCardSize() {
    let size=1;
    if (this._mode!=='discharge') size+=4;
    if (this._mode!=='charge') size+=2+Math.min(this._entities.dischargeSlots.length,3);
    return size;
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    if (!Element.prototype.matches) {
      Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
    if (!Element.prototype.closest) {
      Element.prototype.closest = function(s) {
        let el=this; do { if(el.matches(s)) return el; el=el.parentElement||el.parentNode; } while(el&&el.nodeType===1); return null;
      };
    }
    if (!this.querySelector('style[data-saj-h2]')) {
      const style=document.createElement('style');
      style.setAttribute('data-saj-h2','');
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
      .power-value { font-size: 1.15em; /* Match font-size of time-select */ font-weight: 500; padding: 16px 12px; /* Match time-selects padding */ background-color: var(--input-fill-color, var(--card-background-color)); border-radius: 8px; /* Match time-selects */ text-align: center; border: 1px solid var(--input-ink-color, var(--divider-color)); /* Match time-selects */ display: inline-block; min-height: 30px; /* Ensure a minimum height */ line-height: normal; /* Adjust if needed for vertical centering with padding */ box-sizing: border-box; /* Include padding and border in the element's total width and height */ min-width: 80px; /* Set minimum width */ }
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
    this._initCard();
  }
}

customElements.define('saj-h2-inverter-card', SajH2InverterCard);
window.customCards = window.customCards||[];
window.customCards.push({ type:'saj-h2-inverter-card', name:'SAJ H2 Inverter Card', description:'Card for controlling charging and discharging settings for SAJ H2 inverters' });