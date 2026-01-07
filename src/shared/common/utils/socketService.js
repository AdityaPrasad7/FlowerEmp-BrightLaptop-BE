import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*', // Allow all origins for simplicity, or configure based on env
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    io.on('connection', (socket) => {
        console.log('Backend: User connected to socket', socket.id);

        // Join a room based on userId if provided (client should emit 'join')
        socket.on('join', (userId) => {
            if (userId) {
                console.log(`Backend: Socket ${socket.id} joining room ${userId}`);
                socket.join(userId);
                // Verify join
                const rooms = Array.from(socket.rooms);
                console.log(`Backend: Socket ${socket.id} rooms:`, rooms);
            } else {
                console.warn('Backend: Socket attempted join without userId');
            }
        });

        socket.on('disconnect', () => {
            console.log('Backend: User disconnected', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const emitNotification = (userId, notification) => {
    if (!io) {
        console.error("Backend Error: IO not initialized during emitNotification");
        return;
    }
    console.log(`Backend: Emitting 'notification' to room ${userId}`, notification.title);
    io.to(userId).emit('notification', notification);
};

export const broadcastEvent = (eventName, data) => {
    if (!io) return;
    io.emit(eventName, data);
};
