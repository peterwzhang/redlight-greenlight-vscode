# Red Light Green Light VSCode Extension

### Game Behavior
- `redLightGreenLight.redLightAction`: Action when typing during red light
  - `warn`: Show warning message (default)
  - `close`: Immediately close VSCodetyping game extension for VSCode that helps improve focus and typing discipline. Only type during GREEN light phases - typing during RED light will trigger configurable consequences!

## Features

🎮 **Interactive Game Panel**: A dedicated panel in the Explorer view with real-time game controls and status

🚦 **Red Light Green Light Phases**: 
- **🟢 GREEN LIGHT**: Type freely and make code changes
- **🔴 RED LIGHT**: Stop typing immediately or face consequences!

⚙️ **Configurable Timing**:
- Set custom durations for red and green light phases
- Enable random timing mode with min/max ranges
- Configure grace period for reaction time after red light starts
- Fine-tune the challenge to your preference

🎵 **Sound Effects**:
- High-quality MP3 audio files using sound-play library
- Cross-platform audio support (Windows, macOS, Linux)
- Separate sounds for red light, green light, violations, and game start/stop
- Adjustable volume and individual sound toggles
- Custom sound files supported - place your own MP3s in assets/sounds/

⚠️ **Violation Actions**:
- **Show Warning**: Display a notification when typing during red light
- **Close IDE**: Immediately quit VSCode on violations (for the brave!)

🎯 **Smart Features**:
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

## Grace Period Feature

The grace period feature provides a small buffer time (default: 0.5 seconds) after the red light starts where typing is still allowed. This helps account for human reaction time and prevents frustrating violations when you're already in the middle of typing.

**How it works:**
- When red light starts, you have a configurable grace period to finish typing
- After the grace period expires, any new typing will trigger violations
- Grace period can be adjusted from 0 to 5 seconds in 0.1-second increments
- Set to 0 for immediate enforcement (hardcore mode!)
- Recommended: 0.3-0.7 seconds for most users

## Extension Settings

This extension contributes the following settings:

### Basic Timing

* `redLightGreenLight.redLightDuration`: Duration of red light phase (1-60 seconds, default: 5)
* `redLightGreenLight.greenLightDuration`: Duration of green light phase (1-60 seconds, default: 10)
* `redLightGreenLight.gracePeriod`: Grace period after red light starts (0-5 seconds, default: 0.5)
* `redLightGreenLight.showTimer`: Show timer countdown in game panel (default: true)

### Random Timing
* `redLightGreenLight.useRandomTiming`: Enable random timing for phases (default: false)
* `redLightGreenLight.randomTiming`: Configure random timing ranges
  * `maxTime`: Maximum random time (2-120 seconds, default: 15)
  * `minTime`: Minimum random time (1-60 seconds, default: 3)

### Game Behavior

* `redLightGreenLight.redLightAction`: Action when typing during red light
  * `warn`: Show warning message (default)
  * `close`: Immediately close VSCode

### Sound Settings
* `redLightGreenLight.enableSounds`: Enable sound notifications (default: false)
* `redLightGreenLight.soundSettings`: Configure audio feedback
  * `volume`: Sound volume 0.0-1.0 (default: 0.5)
  * `redLightSound`: Play sound on red light start (default: true)
  * `greenLightSound`: Play sound on green light start (default: true)
  * `violationSound`: Play sound on violations (default: true)
  * `gameStartSound`: Play sound on game start/stop (default: true)

## Commands

* `Red Light Green Light: Start Game` - Begin a new game session
* `Red Light Green Light: Stop Game` - End the current game session
* `Red Light Green Light: Toggle Game` - Start/stop the game
* `Red Light Green Light: Show Stats` - View current session statistics

## Installation

1. Install the extension from the VSCode marketplace
2. Open VSCode and look for the "Red Light Green Light" panel in the Explorer view
3. Configure your preferred settings
4. Start playing and improve your typing discipline!

## Tips for Success

- Start with longer intervals (10+ seconds) and gradually decrease
- Use the warning action first before trying the close action
- Enable sounds for better audio cues - add your own MP3 files for custom audio
- Random timing mode adds unpredictability and challenge
- Adjust grace period to match your reaction time (0.5s is good for most users)
- Hide the timer for a more immersive experience or to reduce anxiety
- Practice restraint - the goal is to develop better coding flow awareness

## Known Issues

- Audio requires the sound-play library and system audio support
- Audio files must be MP3 format and placed in assets/sounds/ directory
- Large audio files may cause loading delays - keep sounds short (0.5-2 seconds)
- Volume control is handled by system audio settings

## Release Notes

### 0.0.1

Initial release featuring:
- Basic red light/green light game mechanics
- Configurable grace period for reaction time after red light starts
- Explorer panel integration
- Configurable timing and actions
- Sound system with multiple audio events
- Settings reorganization and improvements
- Command palette integration

---

**Enjoy the game and happy coding! 🎮**

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
