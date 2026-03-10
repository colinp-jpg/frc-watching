# Installing FRC Match Videos as an App

This PWA (Progressive Web App) can be installed on your device like a native app!

## 📱 iPhone/iPad Installation

1. Open Safari and navigate to your hosted app URL
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "FRC Videos" (or whatever you like)
5. Tap **Add**
6. The app icon will appear on your home screen!

## 💻 Desktop Installation (Chrome, Edge, Brave)

1. Open the app in your browser
2. Look for the **install icon** (⊕) in the address bar
3. Click it and select **Install**
4. The app will open in its own window

## 🤖 Android Installation

1. Open Chrome and navigate to your app
2. Tap the **three-dot menu** (⋮)
3. Select **"Add to Home screen"** or **"Install app"**
4. Confirm the installation
5. The app icon will appear in your app drawer!

## 🌐 Hosting Your App

To make the app installable, you need to host it on a web server with HTTPS. Options:

### Quick & Free Options:
1. **GitHub Pages**: Push to a repo, enable Pages in settings
2. **Netlify**: Drag and drop your folder at netlify.com/drop
3. **Vercel**: Import from GitHub or deploy directly
4. **Firebase Hosting**: `firebase deploy`

### Local Testing:
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve
```

Then visit `http://localhost:8000` (note: service workers require HTTPS in production)

## 📦 What's Included

- ✅ Offline capability
- ✅ Install to home screen/desktop
- ✅ Fullscreen experience
- ✅ Fast loading with caching
- ✅ iOS and Android compatible

## 🎨 Custom Icons

The app needs icons for installation. Create these PNG files:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

You can use any FRC-related image or logo. Simple options:
- Create a colored square with "FRC" text
- Use the FIRST logo (if permitted)
- Design a custom icon with your team colors

## 🔧 Updating the App

When you make changes:
1. Update the `CACHE_NAME` in `service-worker.js` (e.g., `'frc-videos-v2'`)
2. Redeploy to your hosting service
3. Users will get the update next time they open the app
