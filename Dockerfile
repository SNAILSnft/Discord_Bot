# Use a specific Node.js Alpine base image for a smaller footprint
FROM node:21.7.1-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json before copying the rest of the files
# This ensures Docker's caching is more effective, as dependency installation will only rerun if these files change
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Pass a token as a build argument
ARG token

# Set the token as an environment variable
ENV TOKEN=$token

# Define the command to run the application
CMD ["node", "index.js"]
