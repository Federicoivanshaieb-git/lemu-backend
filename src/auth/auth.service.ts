import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly collectionName = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  // Helper para generar un código de 6 dígitos
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Helper para enviar el código por email (Integrar con Nodemailer/Resend)
  private async sendVerificationEmail(email: string, code: string) {
    // TODO: Conectar con tu servicio de envío de correos (ej. Nodemailer, Resend, SendGrid)
    console.log(`[AUTH SERVICE] Código OTP para ${email}: ${code}`);
  }

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
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await userRef.set(newUser);
      return { isNew: true, user: newUser };
    }

    return { isNew: false, user: userDoc.data() };
  }

  // 2. REGISTRO LOCAL CON EMAIL Y CONTRASEÑA + ENVÍO DE CÓDIGO OTP
  async register(registerUserDto: RegisterUserDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      // Generar código OTP y tiempo de expiración (10 minutos)
      const otpCode = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Crear el usuario en Firebase Auth
      const userRecord = await auth.createUser({
        email: registerUserDto.email,
        password: registerUserDto.password,
        displayName: registerUserDto.name,
      });

      // Crear el perfil del usuario en Firestore
      const newUser = {
        uid: userRecord.uid,
        email: registerUserDto.email,
        name: registerUserDto.name || '',
        phone: registerUserDto.phone || '',
        role: 'client',
        provider: 'password',
        isEmailVerified: false,
        otpCode,
        otpExpiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection(this.collectionName).doc(userRecord.uid).set(newUser);

      // Enviar mail con el código
      await this.sendVerificationEmail(registerUserDto.email, otpCode);

      return {
        message: 'Usuario registrado. Revisa tu correo electrónico para verificar tu cuenta.',
        email: registerUserDto.email,
        requiresVerification: true,
      };
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('El correo electrónico ya está registrado.');
      }
      throw new BadRequestException(error.message || 'Error al registrar el usuario.');
    }
  }

  // 3. VERIFICAR CÓDIGO OTP DE EMAIL
  async verifyCode(email: string, code: string) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const userRecord = await auth.getUserByEmail(email);
      const userRef = db.collection(this.collectionName).doc(userRecord.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new BadRequestException('Usuario no encontrado.');
      }

      const userData = userDoc.data();

      if (userData?.isEmailVerified) {
        return { message: 'El correo electrónico ya se encuentra verificado.' };
      }

      if (userData?.otpCode !== code) {
        throw new BadRequestException('El código de verificación es incorrecto.');
      }

      if (new Date(userData?.otpExpiresAt) < new Date()) {
        throw new BadRequestException('El código de verificación ha expirado. Solicita uno nuevo.');
      }

      // Marcar usuario como verificado y limpiar OTP
      await userRef.update({
        isEmailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date().toISOString(),
      });

      // Crear token de sesión
      const customToken = await auth.createCustomToken(userRecord.uid);

      return {
        message: 'Correo verificado con éxito.',
        token: customToken,
        user: { ...userData, isEmailVerified: true },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al verificar el código.');
    }
  }

  // 4. REENVIAR CÓDIGO OTP
  async resendCode(email: string) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const userRecord = await auth.getUserByEmail(email);
      const userRef = db.collection(this.collectionName).doc(userRecord.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new BadRequestException('Usuario no encontrado.');
      }

      const otpCode = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await userRef.update({
        otpCode,
        otpExpiresAt,
        updatedAt: new Date().toISOString(),
      });

      await this.sendVerificationEmail(email, otpCode);

      return { message: 'Se ha enviado un nuevo código de verificación a tu correo.' };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al reenviar el código.');
    }
  }

  // 5. LOGIN TRADICIONAL (VALIDA SI ESTÁ VERIFICADO)
  async login(loginDto: LoginDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const userRecord = await auth.getUserByEmail(loginDto.email);
      const userDoc = await db.collection(this.collectionName).doc(userRecord.uid).get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('Usuario no encontrado en la base de datos.');
      }

      const userData = userDoc.data();

      // Bloquear login si no ha verificado el email
      if (!userData?.isEmailVerified) {
        throw new UnauthorizedException({
          message: 'Debes verificar tu correo electrónico antes de ingresar.',
          requiresVerification: true,
          email: loginDto.email,
        });
      }

      const customToken = await auth.createCustomToken(userRecord.uid);

      return {
        token: customToken,
        user: userData,
      };
    } catch (error: any) {
      if (error?.response?.requiresVerification) {
        throw new UnauthorizedException(error.response);
      }
      throw new UnauthorizedException('Credenciales inválidas o usuario no registrado.');
    }
  }

// 6. LOGIN / REGISTRO CON GOOGLE (GMAIL) -> FORZAR CÓDIGO OTP
  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const decodedToken = await auth.verifyIdToken(googleLoginDto.idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email || googleLoginDto.email;

      const userRef = db.collection(this.collectionName).doc(uid);
      const userDoc = await userRef.get();

      // CASE A: El usuario no existe en Firestore (Primer registro)
      if (!userDoc.exists) {
        const otpCode = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const newUser = {
          uid,
          email,
          name: decodedToken.name || googleLoginDto.name || 'Usuario Google',
          picture: decodedToken.picture || googleLoginDto.picture || '',
          role: 'client',
          provider: 'google',
          isEmailVerified: false, // Guardamos como no verificado
          otpCode,
          otpExpiresAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await userRef.set(newUser);
        await this.sendVerificationEmail(email, otpCode);

        // Lanzamos la excepción para bloquear el ingreso y obligar al frontend a redirigir
        throw new UnauthorizedException({
          message: 'Debes verificar tu correo electrónico para completar el registro.',
          requiresVerification: true,
          email,
        });
      }

      const userData = userDoc.data();

      // CASE B: El usuario ya existe pero NO está verificado (isEmailVerified === false)
      if (!userData?.isEmailVerified) {
        const otpCode = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await userRef.update({
          otpCode,
          otpExpiresAt,
          updatedAt: new Date().toISOString(),
        });

        await this.sendVerificationEmail(email, otpCode);

        throw new UnauthorizedException({
          message: 'Debes verificar tu correo electrónico antes de ingresar.',
          requiresVerification: true,
          email,
        });
      }

      // CASE C: Usuario verificado previamente -> Se le otorga el Custom Token
      const customToken = await auth.createCustomToken(uid);

      return {
        token: customToken,
        user: userData,
      };
    } catch (error: any) {
      if (error?.response?.requiresVerification) {
        throw new UnauthorizedException(error.response);
      }
      throw new UnauthorizedException(error.message || 'Token de Google inválido o expirado.');
    }
  }
}