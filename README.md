# VU Attendy

Employee attendance app for Vape Ustad stores with employee login, head office backend, announcements, live photo capture, and location tracking.

## Features

- Employee login with ID and password
- Check-in / check-out attendance
- Live photo capture using device camera
- Location sharing with Google Maps link
- Head office announcements and daily messages
- Head office admin dashboard for posting notices and viewing attendance

## Setup

1. Run `npm install`.
2. Start the app with `npm start`.
3. Open `http://localhost:3000` in a browser for employee access.
4. Open `http://localhost:3000/admin.html` for head office access.

## Sample accounts

- Employee: `E1001`, Password: `1234`
- Employee: `E1002`, Password: `1234`
- Employee: `E1003`, Password: `1234`
- Head office admin: `headoffice`, Password: `office123`

## Usage

- Employee uses the main page to login, check in, capture photo, share location, and check out.
- Head office uses `admin.html` to login, post announcements, and view attendance records. This page is the only place where all workers' attendance and messages are visible.

## Notes

- This app now includes a backend server and persistent `data.json` storage.
- **PWA Ready**: Install as an app on Android/iOS home screen (see [DEPLOYMENT.md](DEPLOYMENT.md))
- For Google Play Store or Apple App Store release, see [DEPLOYMENT.md](DEPLOYMENT.md)
- For production, upgrade authentication, secure passwords, and use a database.
