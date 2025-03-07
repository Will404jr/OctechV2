# Use an official Node.js image as the base
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Use a lightweight Node.js image for running the app
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# Ensure the uploads folder exists inside the container
RUN mkdir -p /app/uploads

# Expose port 3000
EXPOSE 3000

# Run the optimized Next.js app
CMD ["npm", "run", "start"]
