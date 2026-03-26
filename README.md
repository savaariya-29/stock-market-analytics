# Stock Market Analysis Web App

A full-stack, professional web application designed for analyzing stock market data using real-time and historical data from Yahoo Finance. This project visualizes market trends, trading volumes, and technical indicators, built with a modern, glassmorphic UI.

## Features
- **Real-time Data**: Fetches the latest stock data using the `yfinance` Python library.
- **Technical Indicators**: Calculates and visualizes MA (50 & 200), EMA (20), and RSI (14).
- **Interactive Charts**: Responsive and interactive price, volume, and RSI charts powered by Chart.js.
- **Modern UI**: Dark-themed, sleek user interface with responsive layout for desktop and mobile, using Google Fonts (Outfit).
- **Trading Signals**: Simple AI calculation that provides basic Buy/Sell signals based on RSI and Moving Averages.

## Technology Stack
- **Backend**: Python 3, Flask, Pandas, yfinance
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Chart.js

## Prerequisites
- Python 3.8+
- Node.js & npm (optional, if you want to use live-server for front-end dev)

## Setup Instructions

### 1. Setup the Backend
Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a virtual environment (recommended):
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

Install the required dependencies:
```bash
pip install -r requirements.txt
```

Run the Flask server:
```bash
python app.py
```
*The API will start at `http://localhost:5000`.*

### 2. Setup the Frontend
The frontend consists of static files (`index.html`, `style.css`, `script.js`).

**Option A (Simplest)**:
1. Navigate to the `frontend` folder.
2. Double-click the `index.html` file in your file explorer to open it in a web browser.

**Option B (Recommended for Dev)**:
Use a simple static server (e.g., Python's `http.server` or npx live-server):
```bash
cd frontend
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Project Structure
```text
├── backend/
│   ├── app.py               # Main Flask application and API routes
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main UI layout
│   ├── style.css            # Custom styling and layout
│   └── script.js            # Frontend logic and API integration
└── README.md                # Project documentation
```

## Future Enhancements
- Compare multiple stocks on the same chart.
- Implement Machine Learning algorithms (LSTM) for price predictions.
- Integrate news sentiment analysis for a selected stock.
- Add user authentication to track portfolio manually.
