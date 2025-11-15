#!/bin/bash

# Quick Start Script for Cloud Media Storage System
# This script helps you get started quickly

echo "=================================="
echo "Cloud Media Storage System"
echo "Quick Start Setup"
echo "=================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8+ first"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠ FFmpeg is not installed"
    echo ""
    echo "Please install FFmpeg:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ FFmpeg found"
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "Installing Python dependencies..."
echo "(This may take a few minutes...)"
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠ .env file not found"
    
    if [ -f "env.example" ]; then
        echo "Creating .env from env.example..."
        cp env.example .env
        echo "✓ .env file created"
        echo ""
        echo "⚠ IMPORTANT: You need to edit .env and add your credentials:"
        echo "  - AWS S3 credentials"
        echo "  - MongoDB or Supabase credentials"
        echo "  - Pinecone API key"
        echo ""
        read -p "Open .env in editor now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        echo "❌ env.example not found"
        exit 1
    fi
else
    echo "✓ .env file exists"
fi

# Run setup validation
echo ""
echo "Running setup validation..."
python setup.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✓ Setup Complete!"
    echo "=================================="
    echo ""
    echo "You can now:"
    echo "  1. Process a file:"
    echo "     python media_processor.py /path/to/file.jpg"
    echo ""
    echo "  2. Start the API server:"
    echo "     python api.py"
    echo "     Then visit http://localhost:8000/docs"
    echo ""
    echo "  3. Run examples:"
    echo "     python example_usage.py"
    echo ""
    echo "Remember to activate the virtual environment:"
    echo "     source venv/bin/activate"
    echo ""
else
    echo ""
    echo "⚠ Setup validation found some issues"
    echo "Please fix them and run: python setup.py"
fi

