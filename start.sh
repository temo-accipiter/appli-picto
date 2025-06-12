#!/bin/bash

echo "🚀 Lancement du backend..."
cd backend
yarn dev &

echo "🎨 Lancement du frontend..."
cd ../frontend
yarn dev
