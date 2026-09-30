import { Injectable, NotFoundException } from '@nestjs/common';
import 'multer';
import { FirebaseService } from '../firebase/firebase.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto, QuoteStatus } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  private readonly collectionName = 'quotes';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto) {
    const db = this.firebaseService.getFirestore();
    const newQuote = {
      ...createQuoteDto,
      images: [],
      status: QuoteStatus.PENDIENTE,
      price: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection(this.collectionName).add(newQuote);
    return { id: docRef.id, ...newQuote };
  }

  async findAll() {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).orderBy('createdAt', 'desc').get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async findOne(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Presupuesto con ID ${id} no encontrado.`);
    }

    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto) {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Presupuesto con ID ${id} no encontrado.`);
    }

    const updateData = {
      ...updateQuoteDto,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);
    return { id, ...(doc.data() as object), ...updateData };
  }

  async uploadQuoteImage(id: string, file: Express.Multer.File) {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Presupuesto con ID ${id} no encontrado.`);
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file.buffer, 'lemu_quotes');
    const existingImages = doc.data()?.images || [];
    const updatedImages = [...existingImages, uploadResult.secure_url];

    await docRef.update({
      images: updatedImages,
      updatedAt: new Date().toISOString(),
    });

    return {
      id,
      imageUrl: uploadResult.secure_url,
      images: updatedImages,
    };
  }
}