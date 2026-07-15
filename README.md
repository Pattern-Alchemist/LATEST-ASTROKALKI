# AstroKalki - Cosmic Analysis & Astrology Platform

A modern, full-featured astrology application built with Next.js, React, and Tailwind CSS. AstroKalki provides personalized astrological readings, birth chart analysis, daily horoscopes, and cosmic guidance.

## Features

- **Personalized Readings** - Get accurate astrological readings based on your birth chart
- **Birth Chart Analysis** - Comprehensive natal chart calculations with planetary positions
- **Daily Horoscopes** - Personalized daily cosmic guidance for all zodiac signs
- **Compatibility Charts** - Analyze cosmic compatibility with other people
- **Transit Charts** - View current planetary movements and their influence
- **Responsive Design** - Beautiful, mobile-first design that works on all devices
- **Dark Mode** - Eye-friendly cosmic-themed dark interface

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui patterns
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Pattern-Alchemist/LATEST-ASTROKALKI.git
cd LATEST-ASTROKALKI
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
# or
yarn install
# or
bun install
```

3. Create environment variables:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
pnpm dev
# or
yarn dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   ├── read/
│   │   └── page.tsx         # Readings page
│   ├── charts/
│   │   └── page.tsx         # Charts page
│   ├── horoscope/
│   │   └── page.tsx         # Horoscope page
│   ├── about/
│   │   └── page.tsx         # About page
│   └── not-found.tsx        # 404 page
├── components/
│   ├── header.tsx           # Navigation header
│   ├── hero.tsx             # Hero section
│   └── footer.tsx           # Footer component
└── ...
```

## Pages

- **Home (/)** - Landing page with features and zodiac signs
- **Readings (/read)** - Get personalized astrological readings
- **Charts (/charts)** - View and explore astrological charts
- **Horoscope (/horoscope)** - Daily, weekly, and monthly horoscopes
- **About (/about)** - Learn about AstroKalki

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

This project is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Vercel will automatically detect Next.js and configure build settings
4. Deploy!

Alternatively, deploy using the Vercel CLI:

```bash
vercel
```

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Color Scheme

The app uses a cosmic-themed dark color palette:
- **Primary**: Indigo (`#6366f1`)
- **Secondary**: Violet (`#8b5cf6`)
- **Accent**: Pink (`#ec4899`)
- **Background**: Dark slate (`#0f172a`)
- **Card**: Darker slate (`#1e293b`)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email hello@astrokalki.com or open an issue on GitHub.

## Acknowledgments

- Inspired by modern astrology and cosmic wisdom
- Built with Next.js and modern web technologies
- Icons from Lucide React
- Styling with Tailwind CSS

---

**AstroKalki** - Your Trusted Guide to Cosmic Wisdom ✨
