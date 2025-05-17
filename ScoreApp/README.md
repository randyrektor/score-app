# Scoreboard App

A React Native scoreboard app optimized for iPad use. This app helps manage team scores and player rotations for sports games.

## Features

- Score tracking for two teams
- Custom team naming
- Player rotation management
- Automatic A/B point tracking
- Player management (add/remove players)
- Gender-based player organization
- iPad-optimized interface

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- iOS Simulator (for testing on iPad)
- Xcode (for iOS development)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Running the App

1. Start the development server:
```bash
npm start
```

2. Run on iOS (iPad):
```bash
npm run ios
```

## Usage

1. **Score Management**
   - Use the +1 and -1 buttons to adjust scores
   - The winning team's score will be highlighted in green

2. **Team Names**
   - The first team is named "Disco Fever" by default
   - You can customize the second team's name by tapping the name field

3. **Player Management**
   - Add new players using the "Add Player" section
   - Players are automatically assigned numbers based on gender
   - The current line shows active players
   - Off players are listed below

4. **Rotation**
   - Use the "Next Point" button to advance the rotation
   - Toggle between A/B points manually or let it auto-switch
   - The app maintains proper gender ratios for each point

## Development

This app is built with:
- React Native
- TypeScript
- Expo

## License

MIT
