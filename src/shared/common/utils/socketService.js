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
        console.log('User connected', socket.id);

        // Join a room based on userId if provided (client should emit 'join')
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`Socket ${socket.id} joined room ${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected', socket.id);
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
    if (!io) return;
    io.to(userId).emit('notification', notification);
};

export const broadcastEvent = (eventName, data) => {
    if (!io) return;
    io.emit(eventName, data);
};
