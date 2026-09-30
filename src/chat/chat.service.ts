import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export interface MessageData {
  chatId: string; // userId del cliente
  senderId: string;
  senderRole: 'client' | 'admin';
  content: string;
  clientName?: string;
  area?: string;
  lote?: string;
  propertyType?: 'grande' | 'chico';
}

@Injectable()
export class ChatService {
  private readonly collectionName = 'chats';

  constructor(private readonly firebaseService: FirebaseService) {}

  async saveMessage(data: MessageData) {
    const db = this.firebaseService.getFirestore();
    const createdAt = new Date().toISOString();

    const message = {
      ...data,
      createdAt,
    };

    // 1. Guardar mensaje en subcolección 'messages'
    const docRef = await db
      .collection(this.collectionName)
      .doc(data.chatId)
      .collection('messages')
      .add(message);

    // 2. Actualizar metadata de la sala para el panel del Admin
    const roomMetadata: Record<string, any> = {
      lastMessage: data.content,
      updatedAt: createdAt,
      clientId: data.chatId,
    };

    // Si el mensaje viene del cliente, actualizamos sus datos de ubicación/lote
    if (data.senderRole === 'client') {
      if (data.clientName) roomMetadata.clientName = data.clientName;
      if (data.area) roomMetadata.area = data.area;
      if (data.lote) roomMetadata.lote = data.lote;
      if (data.propertyType) roomMetadata.propertyType = data.propertyType;
    }

    await db.collection(this.collectionName).doc(data.chatId).set(roomMetadata, { merge: true });

    return { id: docRef.id, ...message };
  }

  async getMessagesByChatId(chatId: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getAllActiveChats() {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      chatId: doc.id,
      ...doc.data(),
    }));
  }
}
