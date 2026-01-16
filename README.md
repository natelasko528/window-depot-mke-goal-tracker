# Window Depot Daily Goal Tracker

A comprehensive daily goal tracking application for Window Depot Milwaukee employees to track reviews, demos, and callbacks.

## Features

- **Daily Goal Tracking**: Track reviews, demos, and callbacks with visual progress indicators
- **User Management**: Simple user creation and selection (no passwords required)
- **Appointment Logging**: Log customer appointments with product interests and notes
- **Social Feed**: Team feed with auto-posts for achievements and manual posts
- **Leaderboard**: Weekly rankings to foster friendly competition
- **Manager Dashboard**: Team overview, admin panel, and detailed reports with charts
- **Data Export**: Export all data as JSON backup
- **Offline Support**: Works offline with IndexedDB storage
- **Mobile-First Design**: Responsive design optimized for mobile devices

## Technology Stack

- **React 18**: Modern React with hooks
- **Recharts**: Data visualization for reports
- **Lucide React**: Icon library
- **IndexedDB**: Client-side data persistence
- **Create React App**: Build tooling

## Getting Started

### Prerequisites

- Node.js 14+ and npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd window-depot-goal-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Usage

1. **Create or Select User**: On first launch, create a new user or select an existing one
2. **Track Daily Goals**: Use the +/- buttons on the dashboard to track your daily activities
3. **Set Goals**: Navigate to Goals to customize your daily targets
4. **Log Appointments**: Add customer appointments with product interests
5. **Engage with Team**: Post updates and interact with team members in the Feed
6. **View Rankings**: Check the Leaderboard to see weekly standings

### Manager Features

Managers have access to additional features:
- **Team View**: Overview of all employees' daily progress
- **Admin Panel**: User management and goal configuration
- **Reports**: Visual charts showing team performance over time

## Data Storage

All data is stored locally in the browser using IndexedDB. Data persists across browser sessions and is user-specific.

## Deployment

This app is deployed on Vercel and is live at:
- **Production URL**: https://window-depot-mke-goal-tracker.vercel.app
- **GitHub Repository**: https://github.com/natelasko528/window-depot-mke-goal-tracker

The app is configured for automatic deployments from the `master` branch. The build output is in the `build` directory.

## License

Proprietary - Window Depot Milwaukee

## Version

1.0.0 - Production Release
