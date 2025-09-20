# Utiliser l'image officielle Node.js version 20 (correspond à votre config Volta)
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json yarn.lock ./

# Installer les dépendances
RUN yarn install

# Copier le code source
COPY . .

# Exposer le port 5173 (port par défaut de Vite)
EXPOSE 5173

# Commande pour démarrer l'application en mode développement
CMD ["yarn", "dev", "--host", "0.0.0.0"]
