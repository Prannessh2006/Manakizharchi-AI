
# Manakizharchi AI

## Overview

**Manakizharchi AI** is an advanced sentiment analysis and social intelligence dashboard that leverages natural language processing (NLP) and machine learning techniques to extract meaningful insights from textual data. The platform provides comprehensive analysis of sentiment patterns, linguistic features, and social dynamics with an intuitive, professional interface.

## Key Features

- **Sentiment Analysis**: Multi-level sentiment classification with confidence scoring
- **Part-of-Speech Tagging**: Linguistic analysis to identify grammatical structures
- **Text Tokenization**: Intelligent text segmentation for detailed examination
- **Stopword Filtering**: Advanced text preprocessing for improved accuracy
- **Punctuation Analysis**: Detailed punctuation pattern recognition
- **Responsive Dashboard**: React-based interface for real-time analysis
- **Scalable Architecture**: TypeScript frontend with Python NLP backend

## Technology Stack

### Frontend
- **React 19.2**: Modern UI framework
- **TypeScript 5.8**: Type-safe development
- **Vite**: Next-generation build tool
- **Lucide React**: Component library

### Backend
- **Python**: Core NLP engine
- **NLTK**: Natural Language Toolkit
- **Libraries.py**: Custom utility functions

## Project Structure

```
Manakizharchi-AI/
├── Backend.py         # NLP and sentiment analysis
├── libraries.py        # Helper utilities
├── output.py          # Result formatting
├── App.tsx            # Main React component
├── index.tsx          # React entry point
├── types.ts           # TypeScript definitions
├── package.json       # Dependencies
├── vite.config.ts    # Vite configuration
├── tsconfig.json      # TypeScript config
└── index.html         # HTML template
```

## Installation

### Prerequisites
- Node.js 18+ (LTS)
- Python 3.8+
- npm or yarn

### Setup Frontend

```bash
npm install
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview build
```

### Setup Backend

```bash
pip install nltk
python Backend.py
```

## Usage

1. Launch the application dashboard
2. Input or paste text for analysis
3. Select analysis type (sentiment, linguistic, or comprehensive)
4. View results with detailed metrics

## Environment Configuration

Create `.env.local`:

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Manakizharchi AI
```

## Development Scripts

```bash
npm run dev        # Development server
npm run build      # Optimized production build
npm run preview    # Preview build locally
```

## Architecture

- **Frontend Layer**: React components with TypeScript type safety
- **API Layer**: RESTful endpoints for communication
- **Analysis Engine**: Python-based NLP processing
- **Output Formatter**: Structured result generation

## Future Enhancements

- Real-time collaborative analysis
- Multi-language support
- Advanced visualizations (graphs, heatmaps)
- Export functionality (PDF, CSV, JSON)
- Machine learning model fine-tuning interface
- API authentication and rate limiting
- Docker containerization

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Push and create a Pull Request

## License

MIT License - see LICENSE file for details

## Author

**Prannessh** - [@Prannessh2006](https://github.com/Prannessh2006)

## Support

For issues or feature requests, please open a GitHub issue.
