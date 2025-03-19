# Vid Extractor - MERmaid

## 📌 Introduction

This repository contains the YouTube video extraction microservice, part of MERmaid. It was developed in Node.js and uses an **event-driven architecture** with RabbitMQ for message queuing. The service listens for download requests, processes them, and sends the results back to a manager queue.

---

## 🛠️ Event-Driven Architecture

The microservice operates based on events exchanged via RabbitMQ queues:

1. **Input Queue (`yt-download`)**: Receives download requests.
2. **Output Queue (`mer-manager`)**: Sends the results of the download process.

### Flow Diagram

```mermaid
sequenceDiagram
    participant Manager
    participant yt_downloader
    participant RabbitMQ
    participant YouTube
    participant /audios

    Manager->>RabbitMQ: Send video URL to `yt-download`
    RabbitMQ->>yt_downloader: Deliver message from `yt-download`
    yt_downloader->>YouTube: Fetch video metadata
    yt_downloader->>YouTube: Download audio stream
    yt_downloader->>/audios: Save audio file
    yt_downloader->>RabbitMQ: Send result to `mer-manager`
    RabbitMQ->>Manager: Deliver message from `mer-manager`
```

---

## 🏗️ DevContainer Setup

### Requirements

- Windows: [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) and [Windows Terminal](https://learn.microsoft.com/en-us/windows/terminal/install)
- [Docker](https://www.docker.com/get-started)
- [VS Code](https://code.visualstudio.com/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### How to Start the DevContainer

In case you missed, start by reading our Development Environment setup guide which introduces WSL2, VSCode, Docker, mise and git via SSH.

1. Clone this repository inside WSL2:
   ```bash
   git clone https://github.com/mer-team/vidExtractor.git
   cd vidExtractor
   code . # this opens VSCode
   ```
2. Inside VS Code select **"Reopen in Container"**.
3. The DevContainer will automatically build and install dependencies using `npm install`.
4. Under VSCode open a terminal, branch, code and push.

If the DevContainer does not start correctly, you may need to force a rebuild:

```bash
Ctrl + Shift + P > "Dev Containers: Rebuild Container"
```

---

## 📂 Project Structure

The most relevant files and folders are:

```
📦 vid-extractor
├── 📂 .devcontainer      # DevContainer configuration
│   ├── Dockerfile        # Base Dockerfile for the container
│   ├── devcontainer.json # DevContainer settings
├── 📂 src               # Project source code
│   ├── downloader.js     # Handles audio downloading from YouTube
│   ├── logger.js         # Configures logging with Winston
│   ├── streamLogger.js   # Logs available audio/video streams for debugging
│   ├── index.js          # Application entry point
├── 📂 test               # Unit tests
│   ├── test.js           # Tests RabbitMQ integration and file downloads
├── 📜 package.json      # Node.js dependencies and configuration
├── 📜 .env               # Environment variables (create or edit as needed)
├── 📜 .eslintrc.js      # ESLint configuration
├── 📜 .prettierrc.js    # Prettier configuration
├── 📜 application.log   # Main log file (rotates automatically)
└── 📜 README.md         # Project documentation
```

### Log Files

- **`application.log`**: The main log file where all application events are recorded. It rotates automatically based on size or time, ensuring logs remain manageable.
- **Rotated Logs**: Older logs are archived with timestamps or incremental numbers (e.g., `application.log.1`, `application.log.2`).
- **Log Levels**: Controlled by the `LOG_LEVEL` environment variable. Supported levels are `debug`, `info`, `warn`, and `error`.

---

## 📦 Service Logic

### Input Queue: `yt-download`

The service listens to the `yt-download` queue for messages containing download requests. Each message must follow this format:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=example"
}
```

- **`videoUrl`**: The URL of the YouTube video to download.

### Processing Logic

1. **Validate the URL**: Ensures the provided YouTube URL is valid.
2. **Fetch Video Info**: Retrieves metadata about the video.
3. **Category Check**: Ensures the video belongs to the "Music" category.
4. **Select Audio Format**: Chooses the best available audio format.
5. **Download Audio**: Downloads the audio stream and saves it to the `/Audios` folder.
6. **Emit Events**: Emits success or failure events based on the outcome.

### Output Queue: `mer-manager`

After processing, the service sends a message to the `mer-manager` queue. The message format depends on the outcome:

#### Success Message

```json
{
  "service": "yt_downloader",
  "songId": "exampleVideoId",
  "status": 200,
  "payload": "/Audios/exampleVideoId.mp3",
  "timestamp": "2023-10-01T12:00:00.000Z"
}
```

- **`service`**: The name of the service (`yt_downloader`).
- **`songId`**: The ID of the processed video.
- **`status`**: HTTP-like status code indicating success.
- **`payload`**: The path to the downloaded audio file.
- **`timestamp`**: The time the message was sent.

#### Failure Message

```json
{
  "service": "yt_downloader",
  "songId": "exampleVideoId",
  "status": 406,
  "message": "Video is not in the Music category.",
  "timestamp": "2023-10-01T12:00:00.000Z"
}
```

- **`service`**: The name of the service (`yt_downloader`).
- **`songId`**: The ID of the video (if available).
- **`status`**: HTTP-like status code indicating failure.
- **`message`**: A description of the error.
- **`timestamp`**: The time the message was sent.

#### Error Message

```json
{
  "service": "yt_downloader",
  "status": 500,
  "message": "An unexpected error occurred.",
  "timestamp": "2023-10-01T12:00:00.000Z"
}
```

- **`service`**: The name of the service (`yt_downloader`).
- **`status`**: HTTP-like status code indicating an internal error.
- **`message`**: A description of the error.
- **`timestamp`**: The time the message was sent.

---

## 🔢 Status Codes

| Code | Description                         |
| ---- | ----------------------------------- |
| 200  | Download completed successfully.    |
| 400  | Invalid YouTube URL.                |
| 404  | No valid audio formats found.       |
| 406  | Video is not in the Music category. |
| 500  | Internal server error.              |

---

## 🔧 Logging Configuration

The logging behavior is controlled by the `LOG_LEVEL` environment variable, which can be set in the `.env` file. Supported levels are:

- **`debug`**: Outputs detailed logs, including a table of all available audio and video streams.
- **`info`**: Outputs general information about the service's operation.
- **`warn`**: Outputs warnings about potential issues.
- **`error`**: Outputs errors that occur during execution.

When `LOG_LEVEL=debug`, the service logs all available audio and video streams in a table format for debugging purposes.

---

## 🔧 Available Commands (`package.json`)

Several commands are defined under `package.json`, check it for details.

```bash
npm start             # run the application
npm run dev           # run in dev mode (with node watch for hot reloading)
npm test              # run unit tests
npm run lint          # check code for errors
npm run lint:fix      # automatically fix issues
npm run prettier      # check formatting issues
npm run prettier:fix  # automatically fix formatting issues
npm run format        # runs prettier:fix and lint:fix together
```

---

## 📦 Running the Microservice

The microservice is designed to run as part of a larger system, orchestrated by the `dev-orchestrator` repository, which launches a RabbitMQ service in an external Docker network.

### Required Environment Variables

| Variable | Default   | Description                       |
| -------- | --------- | --------------------------------- |
| HOST     | localhost | RabbitMQ host                     |
| USER     | guest     | RabbitMQ username                 |
| PASS     | guest     | RabbitMQ password                 |
| PORT     | 5672      | RabbitMQ communication port       |
| MNG_PORT | 15672     | RabbitMQ management UI port       |
| TIME     | 10        | Timeout check for service startup |

### Required Volumes

| Container Path | Description                                    |
| -------------- | ---------------------------------------------- |
| `/audios`      | Folder where downloaded audio files are stored |

### Running Locally with Dev-Orchestrator

Start the RabbitMQ service using `dev-orchestrator`:

```bash
docker network create dev-net
cd path/to/dev-orchestrator
docker-compose up -d rabbitmq
```

### Build and Run `vidExtractor` Locally

#### Build from Source

```bash
docker build -t vidextractor:local .
```

#### Run Locally Using the Built Image

```bash
docker run --rm --network=dev-net \
  -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=rabbitmq -e MNG_PORT=15672 \
  -v "$(pwd)/Audios":/vidExtractor/Audios vidextractor:local
```

#### Run the Official Image Locally

```bash
docker run --network=dev-net \
  -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=rabbitmq -e MNG_PORT=15672 \
  -v "$(pwd)/Audios":/vidExtractor/Audios merteam/vidextractor:latest
```

---

## 🛠️ Technologies Used

- **Node.js 22** (latest LTS version)
- **Docker + DevContainer** (for isolated development environment)
- **RabbitMQ** (message queue service)
- **EventEmitter** (for event-driven programming)
- **Winston** (for logging with log rotation)
- **Progress** (for tracking download progress)
- **ESLint & Prettier** (for code quality)
- **Mocha** (for unit testing)

---
