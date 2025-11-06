# Discord Bot - Trickcal Revival Community Bot

## Overview
This is a Discord bot for the Trickcal Revival game community. The bot provides Korean language support for:
- Fetching latest game updates and announcements from Naver Cafe
- Displaying available coupons and coupon codes
- Text-to-speech (TTS) functionality in voice channels
- New member welcome messages
- Game guides and helpful links

## Recent Changes
**November 6, 2025**: Initial Replit setup
- Installed Node.js dependencies
- Configured Discord bot TOKEN as environment secret
- Set up workflow to run the bot
- Created .gitignore for Node.js project

## Project Architecture

### Technology Stack
- **Runtime**: Node.js (using ES modules)
- **Main Framework**: discord.js v14.24.2
- **Voice Support**: @discordjs/voice v0.19.0
- **Web Scraping**: Puppeteer v21.3.8
- **TTS**: google-tts-api v2.0.2

### File Structure
```
/
├── index.js         # Main bot logic and event handlers
├── config.json      # Configuration file (not used for TOKEN)
├── package.json     # Dependencies and project metadata
└── .gitignore       # Git ignore rules
```

### Key Features

#### 1. Command System (Prefix: `!`)
- `!도움말` - Show available commands
- `!공지` - Fetch latest announcements
- `!쿠폰` - Show latest coupon post
- `!쿠폰목록` - List all available coupons with codes
- `!뉴비가이드` - Beginner's guide links
- `!사도`, `!광기`, `!냉정` - Character personality guides

#### 2. TTS Functionality
- Automatically reads messages in the "tts" channel
- Requires user to be in a voice channel
- Uses Google TTS API for Korean language

#### 3. Web Scraping
- Scrapes Naver Cafe for game updates
- Extracts coupon codes automatically
- Provides preview of post content

#### 4. Auto-welcome
- Greets new members when they join the server

## Environment Variables
- `TOKEN` - Discord bot token (stored in Replit Secrets)

## Dependencies Notes
- The bot requires Puppeteer which needs headless browser support
- Voice features require FFmpeg for audio processing
- Some packages show version warnings (Node.js 22+ preferred for @discordjs/voice) but run on Node.js 20

## Running the Bot
The bot runs automatically via the configured workflow:
```bash
node index.js
```

## Important URLs
- Naver Cafe Updates: https://m.cafe.naver.com/ca-fe/web/cafes/30131231/menus/67
- Naver Cafe Coupons: https://m.cafe.naver.com/ca-fe/web/cafes/30131231/menus/85
