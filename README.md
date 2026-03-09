# FRC Match Videos - The Blue Alliance

A better interface for watching FRC (FIRST Robotics Competition) match videos from The Blue Alliance.

## Features

- 🎥 Browse all matches from any FRC event
- 📹 Filter matches by type (Qualification, Quarter Finals, Semi Finals, Finals)
- ✅ Only show matches with available videos
- ⚡ Easy video navigation with previous/next buttons
- 📊 View match details including team alliances and scores
- 💾 Remembers your API key and last event
- ⌨️ Keyboard shortcuts (Arrow keys to navigate, Esc to close)

## Setup

### 1. Get Your Blue Alliance API Key

1. Go to [The Blue Alliance](https://www.thebluealliance.com/)
2. Sign in or create an account
3. Go to [Account Settings](https://www.thebluealliance.com/account)
4. Generate a new API key (Read API Key)
5. Copy your API key

### 2. Find Event Keys

1. Visit [TBA Events Page](https://www.thebluealliance.com/events)
2. Click on any event
3. The event key is in the URL. For example:
   - URL: `https://www.thebluealliance.com/event/2024cmptx`
   - Event Key: `2024cmptx`

### 3. Run the Website

Simply open `index.html` in your web browser. No build process or server needed!

Alternatively, you can use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Then open http://localhost:8000 in your browser
```

## Usage

1. Enter your TBA API key
2. Enter an event key (e.g., `2024cmptx` for 2024 Championships)
3. Click "Load Matches"
4. Browse the matches and click on any match with videos to watch
5. Use the Previous/Next buttons or arrow keys to navigate between videos

## Tips

- Your API key and last event are saved in your browser
- Use the "Only show matches with videos" filter to hide matches without videos
- Filter by match type to find specific rounds
- Press `Esc` to close the video player
- Use arrow keys to navigate between videos

## Event Key Examples

- `2024cmptx` - 2024 Houston Championships
- `2024cmptx` - 2024 FIRST Championship (Houston)
- `2024cmp` - 2024 FIRST Championship
- `2023txho` - 2023 Houston Regional
- Find more at: https://www.thebluealliance.com/events

## Privacy

All data is fetched directly from The Blue Alliance API. Your API key is stored only in your browser's local storage and is never sent anywhere except to The Blue Alliance servers.

## Credits

- Data provided by [The Blue Alliance](https://www.thebluealliance.com/)
- Videos hosted on YouTube
- Built for the FRC community 🤖

## License

MIT License - Feel free to use and modify!
