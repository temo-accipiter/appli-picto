#!/bin/bash

echo "🚀 Lancement du BACKEND..."
cd backend
yarn dev &

sleep 2

echo "🎨 Lancement du FRONTEND..."
cd ../frontend
yarn dev
