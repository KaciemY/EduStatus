# EduStatus

**Monitor the availability and response times of educational portals.**

EduStatus is a web application designed to check the availability of educational websites, measure their response times, and present the results in a clear ranking.

🌐 **Live demo:** [edu-status-ten.vercel.app](https://edu-status-ten.vercel.app)

## Features

- **Portal monitoring** — check the availability of educational websites.
- **Response time measurement** — track how quickly portals respond.
- **Ranking system** — compare portals based on their response times.
- **Ranking history** — explore changes in portal rankings over time.
- **Responsive interface** — access the application from different devices.

> **Note:** Historical data persistence in the deployed version is still under development.

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework
- [React](https://react.dev/) — user interface
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Recharts](https://recharts.org/) — data visualization
- [Vercel](https://vercel.com/) — deployment

## Getting Started

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm (included with Node.js)
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/KaciemY/EduStatus.git
   ```

2. Navigate to the project directory:

   ```bash
   cd EduStatus
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

To verify the production build, run:

```bash
npm run build
```

## Project Structure

```text
EduStatus/
├── app/
│   ├── api/
│   │   ├── check/
│   │   ├── portals/
│   │   └── ranking-history/
│   ├── ranking/
│   └── page.tsx
├── components/
├── lib/
├── public/
├── data/
├── package.json
└── README.md
```

## Roadmap

- [x] Initial web application
- [x] Portal monitoring API
- [x] Response time ranking
- [x] Deployment on Vercel
- [ ] Persistent storage for historical data
- [ ] Discord bot integration
- [ ] Additional monitoring and statistics

## Author

Created by [KaciemY](https://github.com/KaciemY).

---

*EduStatus is an independent project developed for learning and experimentation.*
