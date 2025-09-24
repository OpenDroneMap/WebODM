#!/bin/bash

# This script builds your React app and integrates it with WebODM

echo "🚀 Starting React app build process..."

# Step 1: Go to React app folder
echo "📂 Navigating to React app directory..."
cd locane || { echo "❌ Error: locane folder not found!"; exit 1; }

# Step 2: Install dependencies (in case anything is missing)
echo "📦 Installing React dependencies..."
npm install

# Step 3: Build React app
echo "🏗️  Building React app..."
npm run build

# Step 4: Check if build was successful
if [ -d "dist" ]; then
    echo "✅ React app built successfully!"
    echo "📁 Built files are in: locane/dist/"
else
    echo "❌ Build failed! Check for errors above."
    exit 1
fi

# Step 5: Go back to main folder
cd ..

# Step 6: Run Django collectstatic to copy files to static root
echo "📋 Running Django collectstatic..."
docker exec webapp python manage.py collectstatic --noinput

echo "🎉 Build complete! React app is ready to serve."
echo "💡 WebODM should now serve the updated React app."