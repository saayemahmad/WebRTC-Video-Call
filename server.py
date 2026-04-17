#!/usr/bin/env python3
"""
Momo.vid - Premium Video Calling Server
A simple HTTP server for serving the video calling application
"""

import http.server
import socketserver
import os
import sys
from datetime import datetime

# Get port from environment variable (for Render) or use default
PORT = int(os.environ.get('PORT', 8000))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with CORS support and logging"""
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging with timestamps"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sys.stdout.write(f"[{timestamp}] {format % args}\n")
        sys.stdout.flush()

def run_server():
    """Start the HTTP server"""
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    
    print("=" * 60)
    print("🚀 Momo.vid Server - Premium Video Calling")
    print("=" * 60)
    print(f"📁 Serving files from: {os.getcwd()}")
    print(f"🌐 Server running on port: {PORT}")
    if PORT == 8000:
        print(f"🔗 Local URL: http://localhost:{PORT}")
    else:
        print(f"🔗 Production mode (PORT from environment)")
    print("=" * 60)
    print("📋 Features:")
    print("  ✓ Real-time video calling")
    print("  ✓ User profiles & online status")
    print("  ✓ Call history tracking")
    print("  ✓ Photo capture during calls")
    print("  ✓ Premium glassmorphism UI")
    print("=" * 60)
    print("💡 Press Ctrl+C to stop the server\n")
    
    # Check if required files exist
    required_files = ['index.html', 'app.js']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"⚠️  WARNING: Missing files: {', '.join(missing_files)}")
        print("   The server may not work correctly.\n")
    else:
        print("✓ All required files found\n")
    
    try:
        # Bind to 0.0.0.0 for Render compatibility
        with socketserver.TCPServer(("0.0.0.0", PORT), CustomHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n" + "=" * 60)
        print("🛑 Server stopped by user")
        print("=" * 60)
        sys.exit(0)
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Address already in use
            print(f"\n❌ ERROR: Port {PORT} is already in use!")
            print(f"   Try closing other applications or use a different port.\n")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    run_server()
