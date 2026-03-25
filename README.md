# Ingenious React Backend

A simple Express.js backend server.

## Prerequisites

- Node.js (v14 or higher recommended)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Usage

Start the server:

```bash
node app.js
```

Or with a custom port:

```bash
PORT=5000 node app.js
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/`      | Returns "Hello World" |

## Project Structure

```
ingenious-react-backend/
├── app.js              # Main application entry point
├── package.json        # Project dependencies and scripts
├── routes/             # Route definitions
├── views/              # View templates
├── public/             # Static assets
│   ├── images/
│   └── javascript/
└── README.md
```

## License

ISC
