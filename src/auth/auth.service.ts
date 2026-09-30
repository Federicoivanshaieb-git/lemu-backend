import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly collectionName = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  // 1. SINCRONIZAR USUARIO
  async syncUser(registerUserDto: RegisterUserDto) {
    if (!registerUserDto.uid) {
      throw new BadRequestException('El UID del usuario es obligatorio para sincronizar.');
    }

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

  // 2. REGISTRO LOCAL CON EMAIL Y CONTRASEÑA
  async register(registerUserDto: RegisterUserDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      // Crear el usuario en Firebase Auth
      const userRecord = await auth.createUser({
        email: registerUserDto.email,
        password: registerUserDto.password,
        displayName: registerUserDto.name,
      });

      // Crear el perfil del usuario en Firestore utilizando el UID generado
      const newUser = {
        uid: userRecord.uid,
        email: registerUserDto.email,
        name: registerUserDto.name || '',
        phone: registerUserDto.phone || '',
        role: 'client',
        provider: 'password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection(this.collectionName).doc(userRecord.uid).set(newUser);

      return {
        message: 'Usuario registrado con éxito',
        user: newUser,
      };
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('El correo electrónico ya está registrado.');
      }
      throw new BadRequestException(error.message || 'Error al registrar el usuario.');
    }
  }

  // 3. LOGIN TRADICIONAL
  async login(loginDto: LoginDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      // Buscar usuario en Firebase Auth por Email
      const userRecord = await auth.getUserByEmail(loginDto.email);
      
      // Obtener datos del perfil desde Firestore
      const userDoc = await db.collection(this.collectionName).doc(userRecord.uid).get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('Usuario no encontrado en la base de datos.');
      }

      // Crear un custom token de Firebase para enviar al Frontend
      const customToken = await auth.createCustomToken(userRecord.uid);

      return {
        token: customToken,
        user: userDoc.data(),
      };
    } catch (error: any) {
      throw new UnauthorizedException('Credenciales inválidas o usuario no registrado.');
    }
  }

  // 4. LOGIN / REGISTRO CON GOOGLE (GMAIL)
  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      // Verificar el token enviado desde el Frontend tras autenticarse con Google
      const decodedToken = await auth.verifyIdToken(googleLoginDto.idToken);
      const uid = decodedToken.uid;

      const userRef = db.collection(this.collectionName).doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        const newUser = {
          uid,
          email: decodedToken.email || googleLoginDto.email,
          name: decodedToken.name || googleLoginDto.name || 'Usuario Google',
          picture: decodedToken.picture || googleLoginDto.picture || '',
          role: 'client',
          provider: 'google',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await userRef.set(newUser);
        return { isNew: true, user: newUser };
      }

      return { isNew: false, user: userDoc.data() };
    } catch (error: any) {
      throw new UnauthorizedException('Token de Google inválido o expirado.');
    }
  }
}