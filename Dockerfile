# Use the official Node.js 18.19.0 image based on Debian Bullseye slim
FROM node:18.19.0-bullseye-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application's code
COPY . .

# Set the token as build argument and environment variable
ARG token 
ENV TOKEN=$token

# Specify the command to run the application
CMD ["node", "index.js"]
