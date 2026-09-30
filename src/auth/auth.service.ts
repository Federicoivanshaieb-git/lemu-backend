import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  private readonly collectionName = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  async syncUser(registerUserDto: RegisterUserDto) {
    const db = this.firebaseService.getFirestore();
    const userRef = db.collection(this.collectionName).doc(registerUserDto.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const newUser = {
        ...registerUserDto,
        role: 'client',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await userRef.set(newUser);
      return { isNew: true, user: newUser };
    }

    return { isNew: false, user: userDoc.data() };
  }
}