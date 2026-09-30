import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService, MessageData } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`⚡ Cliente conectado al chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    client.join(data.userId);
    console.log(`📌 Socket ${client.id} unido a la sala: ${data.userId}`);
    return { status: 'joined', room: data.userId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() data: MessageData) {
    const savedMessage = await this.chatService.saveMessage(data);

    // Emite el mensaje en tiempo real a la sala del cliente
    this.server.to(data.chatId).emit('newMessage', savedMessage);

    return savedMessage;
  }
}