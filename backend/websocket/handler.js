const prisma = require('../lib/prisma');

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected to WebSocket:', socket.id);

    // Join a specific market room
    socket.on('join-market', (marketId) => {
      socket.join(`market:${marketId}`);
      console.log(`Socket ${socket.id} joined market:${marketId}`);
    });

    // Leave a market room
    socket.on('leave-market', (marketId) => {
      socket.leave(`market:${marketId}`);
      console.log(`Socket ${socket.id} left market:${marketId}`);
    });

    // Join personal feed room
    socket.on('join-user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from WebSocket:', socket.id);
    });
  });
};

// Helper function to broadcast odds updates
const broadcastOddsUpdate = (io, marketId, data) => {
  if (!io) return;
  io.to(`market:${marketId}`).emit('odds-updated', {
    marketId,
    yesPercentage: data.yesPercentage,
    noPercentage: data.noPercentage,
    totalVolume: data.totalVolume,
    sentiment: data.sentiment
  });
};

// Helper function to broadcast predictions to followers
const broadcastToFollowers = async (io, userId, predictionData) => {
  if (!io) return;
  try {
    const followers = await prisma.userFollower.findMany({
      where: { userId: userId },
      select: { followerId: true }
    });

    for (const follower of followers) {
      io.to(`user:${follower.followerId}`).emit('follower-prediction', predictionData);
    }
  } catch (error) {
    console.error('Error broadcasting to followers:', error);
  }
};

module.exports = {
  registerSocketHandlers,
  broadcastOddsUpdate,
  broadcastToFollowers
};
