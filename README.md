# Vid Extractor - DevContainer Setup

## 📌 Introduction

This repository contains the YouTube video extraction microservice part of MERmaid. It was developed in Node.js, configured to use a **DevContainer** in VS Code. The DevContainer ensures a standardized development environment with all necessary dependencies.

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
│   ├── index.js          # Application entry point (code is split into multiple files)
├── 📂 test               # Unit tests
├── 📜 package.json      # Node.js dependencies and configuration
├── 📜 .env               # Environment variables (create or edit as needed)
├── 📜 .eslintrc.js      # ESLint configuration
├── 📜 .prettierrc.js    # Prettier configuration
└── 📜 README.md         # Project documentation
```

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
| `/Audios`      | Folder where downloaded audio files are stored |

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
- **ESLint & Prettier** (for code quality)
- **Mocha** (for unit testing)

---
