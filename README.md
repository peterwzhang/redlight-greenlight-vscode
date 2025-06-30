# Red Light Green Light VSCode Extension

A VSCode extension that implements a typing discipline game to improve focus and coding habits. Type only during green light phases - typing during red light triggers configurable consequences.

## Features

**Interactive Game Panel**: A dedicated panel in the Explorer view with real-time game controls and status

**Red Light Green Light Phases**: 
- **🟢 GREEN LIGHT**: Type freely and make code changes
- **🔴 RED LIGHT**: Stop typing immediately or face consequences

**Configurable Timing**:
- Set custom durations for red and green light phases
- Enable random timing mode with min/max ranges
- Configure grace period for reaction time after red light starts
- Fine-tune the challenge to your preference

**Sound Effects**:
- High-quality MP3 audio files using sound-play library
- Cross-platform audio support (Windows, macOS, Linux)
- Separate sounds for red light, green light, violations, and game start/stop
- Adjustable volume and individual sound toggles
- Custom sound files supported - place your own MP3s in assets/sounds/

**Violation Actions**:
- **Show Warning**: Display a notification when typing during red light
- **Close IDE**: Immediately quit VSCode on violations (for advanced users)

**Smart Features**:
- Real-time timer display (can be hidden in settings)
- Session statistics tracking
- Visual feedback and status updates
- Command palette integration

## How to Use

1. **Find the Game Panel**: Look for "Red Light Green Light" in the Explorer sidebar
2. **Start Playing**: Click "Start Game" or use Command Palette (Ctrl+Shift+P) → "Start Red Light Green Light Game"
3. **Follow the Lights**: 
   - 🟢 **GREEN LIGHT**: Type away, make changes, code freely
   - 🔴 **RED LIGHT**: Stop all typing immediately! (You have a small grace period to finish current keystrokes)
4. **Configure Settings**: Go to Settings → Extensions → Red Light Green Light to customize

## Extension Settings

This extension contributes the following settings:

### Basic Timing

- `redLightGreenLight.redLightDuration`: Duration of red light phase (1-60 seconds, default: 5)
- `redLightGreenLight.greenLightDuration`: Duration of green light phase (1-60 seconds, default: 10)
- `redLightGreenLight.gracePeriod`: Grace period after red light starts (0-5 seconds, default: 0.5)
- `redLightGreenLight.showTimer`: Show timer countdown in game panel (default: true)

### Random Timing

- `redLightGreenLight.useRandomTiming`: Enable random timing for phases (default: false)
- `redLightGreenLight.randomTiming`: Configure random timing ranges
  - `maxTime`: Maximum random time (2-120 seconds, default: 15)
  - `minTime`: Minimum random time (1-60 seconds, default: 3)

### Game Behavior

- `redLightGreenLight.redLightAction`: Action when typing during red light
  - `warn`: Show warning message (default)
  - `close`: Immediately close VSCode

### Sound Settings

- `redLightGreenLight.enableSounds`: Enable sound notifications (default: false)
- `redLightGreenLight.soundSettings`: Configure audio feedback
  - `volume`: Sound volume 0.0-1.0 (default: 0.5)
  - `redLightSound`: Play sound on red light start (default: true)
  - `greenLightSound`: Play sound on green light start (default: true)
  - `violationSound`: Play sound on violations (default: true)
  - `gameStartSound`: Play sound on game start/stop (default: true)

## Commands

- `Red Light Green Light: Start Game` - Begin a new game session
- `Red Light Green Light: Stop Game` - End the current game session
- `Red Light Green Light: Toggle Game` - Start/stop the game
- `Red Light Green Light: Show Stats` - View current session statistics

## Tips for Success

- Start with longer intervals (10+ seconds) and gradually decrease
- Use the warning action first before trying the close action
- Enable sounds for better audio cues - add your own MP3 files for custom audio
- Random timing mode adds unpredictability and challenge
- Adjust grace period to match your reaction time (0.5s is good for most users)
- Hide the timer for a more immersive experience or to reduce anxiety
- Practice restraint - the goal is to develop better coding flow awareness

## Installation

1. Install the extension from the VSCode marketplace
2. Open VSCode and look for the "Red Light Green Light" panel in the Explorer view
3. Configure your preferred settings
4. Start playing and improve your typing discipline

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- VSCode

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd redlight-greenlight-vscode
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Run in development mode:**
   - Open the project in VSCode
   - Press `F5` to launch a new Extension Development Host window
   - The extension will be loaded automatically in the new window

### Development Commands

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development (auto-recompile on changes)
- `npm run package` - Package extension for distribution
- `npm run test` - Run tests

### Adding Custom Sounds

To test custom audio files during development:

1. Create MP3 files in `assets/sounds/` directory:
   - `red-light.mp3` - Played when red light starts
   - `green-light.mp3` - Played when green light starts
   - `violation.mp3` - Played when typing during red light
   - `game-start.mp3` - Played when game starts
   - `game-stop.mp3` - Played when game stops

2. Enable sounds in extension settings
3. Test audio functionality using the "Test Audio" button in settings

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes and version history. 