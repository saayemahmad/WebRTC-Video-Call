# Momo.vid - Premium Video Calling App

A modern, real-time video calling application with a beautiful UI and premium features.

## Features

- 🎥 **Real-time Video Calling** - High-quality peer-to-peer video calls using WebRTC
- 👥 **User Profiles** - Switch between Sayem and Shajeda profiles
- 🟢 **Online Status** - Real-time online/offline status detection
- 📞 **Call Management** - Accept, decline, or end calls with smooth animations
- 📸 **Photo Capture** - Take snapshots during video calls
- 📊 **Call History** - Track all incoming, outgoing, and missed calls with duration
- 🎨 **Premium UI** - Glassmorphism design with smooth animations
- 📱 **Mobile Responsive** - Works perfectly on desktop and mobile devices
- 🔒 **Firebase Backend** - Secure real-time database for signaling

## Quick Start

### Prerequisites

- Python 3.x installed
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Internet connection

### Installation

1. Clone or download this repository
2. Open terminal in the project folder
3. Run the server:

```bash
python server.py
```

4. Open your browser and go to: `http://localhost:8000`

### Usage

1. **Login**: Select a user profile (Sayem or Shajeda)
2. **Make a Call**: Click the "Call" button when your partner is online
3. **Answer a Call**: Click "Accept" when receiving an incoming call
4. **During Call**:
   - Toggle microphone/camera
   - Capture photos
   - End call
5. **View History**: Check recent calls in the dashboard

## Project Structure

```
momo.vid/
├── index.html          # Main HTML file with UI
├── app.js             # JavaScript logic and WebRTC implementation
├── server.py          # Python HTTP server
├── start.bat          # Windows batch file to start server
└── README.md          # This file
```

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **WebRTC**: Peer-to-peer video/audio communication
- **Firebase**: Real-time database for signaling
- **STUN/TURN**: Google STUN servers + OpenRelay TURN servers
- **Backend**: Python HTTP server

## Features in Detail

### Video Calling
- Peer-to-peer connection using WebRTC
- Automatic ICE candidate exchange
- Support for STUN/TURN servers for NAT traversal
- Auto-reconnection on temporary disconnections

### User Interface
- Glassmorphism design with blur effects
- Smooth animations and transitions
- Auto-hiding controls during calls
- Live call duration timer
- Premium avatar effects

### Call History
- Tracks all calls (incoming, outgoing, missed)
- Shows call duration for completed calls
- Displays relative timestamps
- Persistent across sessions

### Mobile Support
- Responsive design for all screen sizes
- Touch-optimized controls
- Safe area support for notched devices
- Landscape mode support

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Firebase Configuration

The app uses Firebase Realtime Database for signaling. The configuration is already set up in `app.js`. If you want to use your own Firebase project:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Update the `firebaseConfig` object in `app.js` with your credentials

## Troubleshooting

### Camera/Microphone Not Working
- Grant browser permissions for camera and microphone
- Check if another app is using the camera
- Try refreshing the page

### Connection Failed
- Check your internet connection
- Ensure both users are online
- Try using a different browser

### Partner Shows Offline
- Refresh the page
- Check Firebase connection in browser console
- Ensure partner is actually logged in

## Deployment to Render

To deploy Momo.vid to Render.com:

### Prerequisites
- GitHub account
- Render account (free tier available)

### Steps

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/momo-vid.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: momo-vid (or your choice)
     - **Environment**: Python 3
     - **Build Command**: (leave empty)
     - **Start Command**: `python server.py`
   - Click "Create Web Service"

3. **Access Your App**:
   - Your app will be available at: `https://your-app-name.onrender.com`
   - Share this URL with others to use your video calling app!

### Important Notes for Render Deployment

- The app uses the `PORT` environment variable automatically
- Render provides HTTPS by default (required for camera/microphone access)
- Free tier may sleep after inactivity (takes ~30s to wake up)
- Firebase configuration is already included in the code

### Files for Deployment

The following files are configured for Render:
- `server.py` - Updated to use PORT environment variable
- `requirements.txt` - Python dependencies (none required)
- `render.yaml` - Optional Render configuration

## Development

To modify the app:

1. Edit `index.html` for UI changes
2. Edit `app.js` for functionality changes
3. Refresh browser to see changes (no build step required)

## License

This project is open source and available for personal and commercial use.

## Credits

- Built with WebRTC technology
- Firebase for real-time database
- Font Awesome for icons
- Google Fonts (Syne & DM Sans)
- Pravatar for demo avatars

---

**Momo.vid** - Connect with someone special 💚
