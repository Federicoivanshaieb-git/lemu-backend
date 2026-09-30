import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { QuoteStatus } from './../src/quotes/dto/update-quote.dto';
import { io, Socket } from 'socket.io-client';

describe('Lemú Backend Architecture - Full E2E Integration Suite', () => {
  let app: INestApplication;
  let createdQuoteId: string;
  let testSocket: Socket;
  const mockUserId = `test_user_${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await app.listen(0); // Listen on random available port
  });

  afterAll(async () => {
    if (testSocket && testSocket.connected) {
      testSocket.disconnect();
    }
    await app.close();
  });

  describe('1. Quotes Module (CRUD & Cloudinary Attachments)', () => {
    it('POST /api/v1/quotes -> should create a new quote request with default status PENDIENTE', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .send({
          serviceType: 'Corte de césped y desmalezado',
          address: 'Sector A, Lote 12 - Predio Grande',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.serviceType).toBe('Corte de césped y desmalezado');
      expect(response.body.status).toBe(QuoteStatus.PENDIENTE);
      expect(response.body.images).toBeDefined();
      expect(Array.isArray(response.body.images)).toBe(true);

      createdQuoteId = response.body.id;
    });

    it('GET /api/v1/quotes -> should retrieve all quotes including the newly created one', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quotes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const exists = response.body.some((q: any) => q.id === createdQuoteId);
      expect(exists).toBe(true);
    });

    it('GET /api/v1/quotes/:id -> should fetch a single quote by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/quotes/${createdQuoteId}`)
        .expect(200);

      expect(response.body.id).toBe(createdQuoteId);
    });

    it('POST /api/v1/quotes/:id/image -> should upload an image attachment to Cloudinary', async () => {
      // Buffer binario completo de una imagen PNG transparente válida (1x1 píxel)
      const dummyImageBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000000020001e221bc330000000049454e44ae426082',
        'hex',
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${createdQuoteId}/image`)
        .attach('file', dummyImageBuffer, 'sample_land.png')
        .expect(201);

      expect(response.body).toHaveProperty('imageUrl');
      expect(response.body.imageUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(response.body.images).toContain(response.body.imageUrl);
    });
  });

  describe('2. Chat Module (HTTP API with Area, Lote & Predio Metadata)', () => {
    it('POST /api/v1/chat/message -> should save a client message containing area, lote, and propertyType', async () => {
      const payload = {
        chatId: mockUserId,
        senderId: mockUserId,
        senderRole: 'client',
        clientName: 'Federico Shaieb',
        area: 'Sector B',
        lote: 'Lote 42',
        propertyType: 'grande',
        content: 'Hola, quisiera cotizar la parquización de mi terreno.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.chatId).toBe(mockUserId);
      expect(response.body.clientName).toBe('Federico Shaieb');
      expect(response.body.area).toBe('Sector B');
      expect(response.body.lote).toBe('Lote 42');
      expect(response.body.propertyType).toBe('grande');
    });

    it('GET /api/v1/chat/rooms -> should list active chat rooms with full client metadata for Admin panel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chat/rooms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      const targetRoom = response.body.find((room: any) => room.chatId === mockUserId);
      expect(targetRoom).toBeDefined();
      expect(targetRoom.clientName).toBe('Federico Shaieb');
      expect(targetRoom.area).toBe('Sector B');
      expect(targetRoom.lote).toBe('Lote 42');
      expect(targetRoom.propertyType).toBe('grande');
      expect(targetRoom.lastMessage).toBe('Hola, quisiera cotizar la parquización de mi terreno.');
    });

    it('GET /api/v1/chat/messages/:chatId -> should fetch conversation history chronologically', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/chat/messages/${mockUserId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].content).toBe('Hola, quisiera cotizar la parquización de mi terreno.');
    });
  });

  describe('3. Chat Gateway (Real-Time WebSockets via Socket.IO)', () => {
    it('Should establish a WebSocket connection, join client private room, and transmit new messages', (done) => {
      const address = app.getHttpServer().address();
      const url = `http://localhost:${address.port}/chat`;

      testSocket = io(url, {
        transports: ['websocket'],
        forceNew: true,
      });

      testSocket.on('connect', () => {
        // 1. Client joins their private room
        testSocket.emit('joinChat', { userId: mockUserId }, (ack: any) => {
          expect(ack.status).toBe('joined');
          expect(ack.room).toBe(mockUserId);

          // 2. Subscribe to incoming real-time messages
          testSocket.on('newMessage', (message: any) => {
            if (message.senderRole === 'admin') {
              expect(message.chatId).toBe(mockUserId);
              expect(message.content).toBe('¡Hola Federico! Con gusto te preparamos el presupuesto.');
              done();
            }
          });

          // 3. Admin sends a reply message to the room
          testSocket.emit('sendMessage', {
            chatId: mockUserId,
            senderId: 'admin_001',
            senderRole: 'admin',
            content: '¡Hola Federico! Con gusto te preparamos el presupuesto.',
          });
        });
      });
    });
  });
});