const amqp = require('amqplib');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://tobyblog.vm:3000", // React user interface
        methods: ["GET", "POST"]
    }
});
const exchangeName = 'comment';
const queueName = 'comment_queue';
const bindingKey = 'post.*';

async function startServer() {
    try {
        // Connect to RabbitMQ server
        amqp.connect('amqp://guest:guest@10.11.15.10')
        .then(connection => {
            return connection.createChannel();
        })
        .then(channel => {
            // Declare the exchange
            channel.assertExchange(exchangeName, 'topic', { durable: false });

            // Declare the queue
            channel.assertQueue(queueName, { durable: false });
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queueName);

            // Bind the queue to the exchange
            channel.bindQueue(queueName, exchangeName, bindingKey);

             // Lắng nghe kết nối Socket.IO
            io.on('connection', (socket) => {
            console.log('Client connected');
            console.log('Số lượng client đang kết nối:', io.engine.clientsCount);
            // Bắt đầu consume messages từ RabbitMQ sau khi client kết nối
            channel.consume(queueName, (message) => {
                if (message !== null) {
                const messageContent = message.content.toString();
                const messageData = JSON.parse(messageContent);
                console.log(" [x] Received %s", messageData);
                io.emit(`newMessage.${messageData.postSlug}`, messageData);
                channel.ack(message);
                }
            });
            socket.on('disconnect', () => {
                console.log('Client disconnected');
                console.log('Số lượng client đang kết nối:', io.engine.clientsCount);
            });
            });

            const port = process.env.PORT || 5000;
            http.listen(port, () => {
            console.log(`Server listening on port ${port}`);
            });
        })
        .catch(err => {
            console.error("Failed to connect to RabbitMQ:", err);
        });
    } catch (error) {
        console.error(error);
    }
}
startServer();
