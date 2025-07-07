# Wizzit - Open Source P2P File Transfer

<div align="center">
  <img src="public/logo.svg" alt="Wizzit Logo" width="120" height="120">
  
  **Secure, Private, Direct File Transfers**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/new/clone?repository-url=https://github.com/mesci/wizzit)
  
  [Live Demo](https://wizzit.org) • [Documentation](#readme) • [Report Bug](../../issues) • [Request Feature](../../issues)
</div>

## What is Wizzit?

Wizzit is a **zero-server, peer-to-peer file transfer platform** that enables direct, secure file sharing between devices. Built with privacy-first principles, Wizzit never stores your files on any server.

### Key Features

- **End-to-End Encryption** - Bank-level security with WebRTC
- **No Server Storage** - Files transfer directly between devices
- **Browser-Based** - No downloads, works in any modern browser
- **Cross-Platform** - Desktop, mobile, tablet compatible
- **Simple Sharing** - One-click link generation
- **Beautiful UI** - Clean, intuitive interface
- **Open Source** - Transparent, community-driven
- **Eco-Friendly** - Minimal server infrastructure

## Quick Start

### One-Click Deploy

Deploy your own Wizzit instance instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mesci/wizzit)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mesci/wizzit)

### Local Development

```bash
# Clone the repository
git clone https://github.com/mesci/wizzit.git
cd wizzit

# Install dependencies
npm install

# Copy environment variables
cp env.example .env.local

# Add your TURN server credentials to .env.local
# TURN_SERVER=turn.your-server.com:3478
# TURN_SECRET=your-secret

# Start development server
npm run dev

# Open http://localhost:3000
```

## TURN Server Setup

**For production use, you MUST set up a TURN server.** This is required for users behind firewalls/NATs.

### Option 1: Use a Service
- **Twilio** - Paid, reliable
- **Xirsys** - Paid, good for WebRTC
- **Metered** - Free tier available

### Option 2: Self-Host with Coturn
See `TURN_SERVER_CONFIG.md` for detailed setup instructions.

### Environment Variables

```bash
# Copy example environment file
cp env.example .env.local

# Configure your TURN server
TURN_SERVER=turn.your-server.com:3478
TURN_SECRET=your-secret-key
STUN_SERVER=stun.l.google.com:19302
```

## How It Works

1. **File Selection**: Choose files to share
2. **Link Generation**: Get a unique sharing link  
3. **P2P Connection**: WebRTC establishes direct connection
4. **Encrypted Transfer**: Files transfer directly between browsers
5. **No Storage**: Files never touch our servers

### Deployment

1. Fork this repository
2. Choose your platform:
   - **Vercel (Recommended)**: Connect and deploy through Vercel dashboard
   - **Netlify**: Connect and deploy through Netlify dashboard
   - **Self-Hosted**: Run `npm run build && npm start`
3. Add environment variables (TURN/STUN configuration)
4. Your instance is ready!

## Development

### Tech Stack

- **Framework**: Next.js 15 (React 18)
- **Styling**: Tailwind CSS
- **WebRTC**: Native browser APIs
- **Icons**: Lucide React
- **TypeScript**: Full type safety

### Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

## Contributing

Found a bug or have an idea? We'd love your help! 

- **Bug Reports**: [Create an issue](../../issues/new) with details
- **Feature Requests**: [Suggest improvements](../../issues/new) 
- **Code Contributions**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Email**: [yusuf@mesci.dev](mailto:yusuf@mesci.dev)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

<div align="left">
  <img src="public/built-in-turkiye.svg" alt="Built in Turkiye" height="40">
</div> 