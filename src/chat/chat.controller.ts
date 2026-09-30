import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat (Tiempo Real)')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('message')
  @ApiOperation({ summary: 'Enviar un mensaje de prueba (Guarda en Firestore y emite por WebSockets)' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado y registrado.' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const savedMessage = await this.chatService.saveMessage(sendMessageDto);

    // Emite el mensaje en tiempo real a la sala del cliente si hay alguien conectado
    this.chatGateway.server.to(sendMessageDto.chatId).emit('newMessage', savedMessage);

    return savedMessage;
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Obtener todas las conversaciones activas (Exclusivo Admin)' })
  getAllActiveChats() {
    return this.chatService.getAllActiveChats();
  }

  @Get('messages/:chatId')
  @ApiOperation({ summary: 'Obtener historial de mensajes de un chat' })
  getMessagesByChatId(@Param('chatId') chatId: string) {
    return this.chatService.getMessagesByChatId(chatId);
  }
}