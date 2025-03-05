FROM python:3.12-slim

# Install system dependencies including FFmpeg and additional codecs
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavfilter-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libpostproc-dev \
    libmp3lame0 \
    libfdk-aac2 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
ENV PORT=5000
EXPOSE 5000

# Command to run the application
CMD ["python", "api.py"] 