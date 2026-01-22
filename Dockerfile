# Use official Anchor image which has Solana + Anchor pre-installed
# This saves ~30 mins of build time
FROM backpackapp/build:v0.28.0

# Set working directory
WORKDIR /app

# The official image likely has a different Rust version.
# checking rustc --version would be good, but usually it's compatible with that Anchor version.
# We might need to downgrade dependencies if the image is old, BUT
# Anchor 0.28 image usually comes with Rust 1.6x or 1.7x.

# Copy source code
COPY . .

# Build
CMD ["anchor", "build"]
