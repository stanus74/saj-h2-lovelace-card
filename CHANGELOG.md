# Changelog 1.1.4

All notable changes to the SAJ H2 Inverter Card will be documented in this file.

## [Unreleased]

### Added
- **Slider Debouncing**: Implemented debouncing for all power sliders (charge power and slot power sliders) to prevent excessive Modbus calls during rapid slider movements
- **Memory Management**: Added proper cleanup of slider timeouts in `disconnectedCallback()` to prevent memory leaks
- **Debug Logging**: Enhanced debug logging for slider debounce operations

### Changed
- **Slider Event Handling**: Modified slider `change` events to use debounced service calls with 800ms delay
- **Render Lifecycle**: Added timeout cleanup before re-rendering to prevent orphaned timers

### Technical Details
- Added `_sliderTimeouts` property to track active debounce timers
- Implemented `_debouncedSliderChange()` method with configurable delay (default 800ms)
- Enhanced `connectedCallback()` and `disconnectedCallback()` for better lifecycle management
- Improved `_renderCard()` to clear pending timeouts before DOM updates

## [Previous Versions]

### Features
- Real-time power control for SAJ H2 inverters
- Charge/discharge power adjustment with visual sliders
- Time-based scheduling for charge/discharge periods
- Multiple slot configuration for complex power management
- Responsive design with mobile support
- Integration with Home Assistant entities

### Bug Fixes
- Fixed interaction conflicts during card rendering
- Improved error handling for missing entities
- Enhanced UI responsiveness during user interactions

---

## Version Format

This project follows [Semantic Versioning](https://semver.org/) for version numbering:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Contributing

When contributing to this project, please:
1. Add entries to the "Unreleased" section
2. Follow the established format
3. Include technical details for significant changes
4. Update this changelog with every pull request