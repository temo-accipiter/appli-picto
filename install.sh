#!/bin/bash

echo "📦 Installation des dépendances BACKEND..."
cd backend
yarn install

echo "📦 Installation des dépendances FRONTEND..."
cd ../frontend
yarn install

echo "✅ Installation terminée."
