const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      ws.username = data.username;
      ws.room = data.room;

      if (!rooms[data.room]) rooms[data.room] = [];
      rooms[data.room].push(ws);

      broadcastUsers(data.room);
    }

    if (data.type === "message") {
      const payload = {
        type: "message",
        username: data.username,
        room: data.room,
        encrypted: data.encrypted,
        timestamp: Date.now(),
        seenBy: [data.username],
      };
      broadcastToRoom(data.room, payload);
    }

    if (data.type === "typing") {
      broadcastToRoom(data.room, {
        type: "typing",
        username: data.username,
      });
    }

    if (data.type === "seen") {
      // Broadcast read receipt (demo only)
      broadcastToRoom(data.room, {
        type: "seen",
        username: data.username,
      });
    }
  });

  ws.on("close", () => {
    if (!ws.room || !rooms[ws.room]) return;
    rooms[ws.room] = rooms[ws.room].filter((user) => user !== ws);
    broadcastUsers(ws.room);
  });
});

function broadcastToRoom(room, data) {
  if (!rooms[room]) return;
  rooms[room].forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastUsers(room) {
  if (!rooms[room]) return;
  const users = rooms[room].map((c) => c.username);
  broadcastToRoom(room, {
    type: "users",
    users,
  });
}

server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
