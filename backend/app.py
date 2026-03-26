from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
import requests
import os
# Point Flask to the frontend directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=frontend_dir, static_url_path='/')

# Enable CORS for external frontend testing if needed
CORS(app)

@app.route('/')
def home():
    """Serve the stock market app UI."""
    return app.send_static_file('index.html')

@app.route('/api/search', methods=['GET'])
def search_stock():
    """Autocomplete search endpoint to fetch valid stock symbols based on user input."""
    query = request.args.get('q', '')
    if len(query) < 1:
        return jsonify([])
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=7&newsCount=0"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        quotes = data.get('quotes', [])
        
        results = []
        for q in quotes:
            # Only include assets with a valid ticker symbol and name
            if 'symbol' in q and ('shortname' in q or 'longname' in q):
                results.append({
                    'symbol': q['symbol'],
                    'name': q.get('shortname') or q.get('longname'),
                    'exchange': q.get('exchDisp', 'Unknown')
                })
        return jsonify(results)
    except Exception as e:
        print(f"Search API Error: {e}")
        return jsonify([])


def calculate_rsi(data, periods=14):
    """Calculate Relative Strength Index."""
    close_delta = data['Close'].diff()
    up = close_delta.clip(lower=0)
    down = -1 * close_delta.clip(upper=0)
    
    ma_up = up.ewm(com=periods - 1, adjust=True, min_periods=periods).mean()
    ma_down = down.ewm(com=periods - 1, adjust=True, min_periods=periods).mean()
    
    rsi = ma_up / ma_down
    rsi = 100 - (100 / (1 + rsi))
    return rsi

@app.route('/api/stock', methods=['GET'])
def get_stock_data():
    """Fetch stock data and calculate indicators."""
    symbol = request.args.get('symbol', 'AAPL')
    period = request.args.get('period', '1y')
    
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period)
        
        if hist.empty:
            return jsonify({'error': 'No data found for the given symbol. Please check the stock symbol.'}), 404
            
        # Reset index to make Date a column and format it as a string
        hist = hist.reset_index()
        # Some yfinance data uses normal Date, some tz-aware. Just get YYYY-MM-DD
        hist['Date'] = pd.to_datetime(hist['Date']).dt.strftime('%Y-%m-%d')
        
        # Calculate Technical Indicators
        hist['MA50'] = hist['Close'].rolling(window=50).mean()
        hist['MA200'] = hist['Close'].rolling(window=200).mean()
        hist['EMA20'] = hist['Close'].ewm(span=20, adjust=False).mean()
        hist['RSI'] = calculate_rsi(hist)
        
        # Replace NaNs with None for standard JSON serialization
        hist = hist.replace({np.nan: None})
        
        # Basic Info
        info = {}
        try:
            info_dict = stock.info
            info['shortName'] = info_dict.get('shortName', symbol)
            info['currentPrice'] = info_dict.get('currentPrice', None)
            info['previousClose'] = info_dict.get('previousClose', None)
            info['currency'] = info_dict.get('currency', 'USD')
        except:
            info['shortName'] = symbol
            info['currentPrice'] = None
            info['previousClose'] = None
            info['currency'] = 'INR' if symbol.endswith(('.NS', '.BO')) else 'USD'

        # Prepare payload
        data = {
            'dates': hist['Date'].tolist(),
            'prices': hist['Close'].tolist(),
            'volumes': hist['Volume'].tolist(),
            'ma50': hist['MA50'].tolist(),
            'ma200': hist['MA200'].tolist(),
            'ema20': hist['EMA20'].tolist(),
            'rsi': hist['RSI'].tolist(),
            'info': info
        }
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
