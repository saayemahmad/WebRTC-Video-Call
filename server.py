#!/usr/bin/env python3
"""
Simple HTTP server for WebRTC Video Caller
Serves static files with proper MIME types and CORS headers
"""

import http.server
import socketserver
import os
import sys
from datetime import datetime

PORT = 8000

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
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("=" * 60)
    print("🚀 WebRTC Video Caller Server - Premium Edition")
    print("=" * 60)
    print(f"📁 Serving files from: {os.getcwd()}")
    print(f"🌐 Server running at: http://localhost:{PORT}")
    print(f"🔗 Open in browser: http://localhost:{PORT}")
    print("=" * 60)
    print("📋 Premium Features:")
    print("  ✓ User login system (Sayem/Shajeda)")
    print("  ✓ Real-time online status detection")
    print("  ✓ Automatic partner calling")
    print("  ✓ Offline detection & protection")
    print("  ✓ WhatsApp-like UI with dark theme")
    print("=" * 60)
    print("🎯 Quick Start:")
    print("  1. Open TWO browser windows at the URL above")
    print("  2. Window 1: Login as 'Sayem'")
    print("  3. Window 2: Login as 'Shajeda'")
    print("  4. Click 'Call' button when partner is online")
    print("  5. Video call connects automatically!")
    print("=" * 60)
    print("💡 Tip: Both users must be online to make a call")
    print("Press Ctrl+C to stop the server\n")
    
    # Check if required files exist
    required_files = ['index.html', 'app.js']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"⚠️  WARNING: Missing files: {', '.join(missing_files)}")
        print("   The server may not work correctly.\n")
    else:
        print("✓ All required files found\n")
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n" + "=" * 60)
        print("🛑 Server stopped by user")
        print("=" * 60)
        sys.exit(0)
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Address already in use
            print(f"\n❌ ERROR: Port {PORT} is already in use!")
            print(f"   Try closing other applications or use a different port.")
            print(f"   You can change the PORT variable in this script.\n")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    run_server()
