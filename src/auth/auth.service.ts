import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private readonly collectionName = 'users';
  private transporter: nodemailer.Transporter;

  constructor(private readonly firebaseService: FirebaseService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendVerificationEmail(email: string, code: string) {
    const mailOptions = {
      from: `"Lemú Paisajismo" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Código de Verificación - Lemú Paisajismo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f2eb; color: #1b3022; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1b3022; text-align: center;">Lemú Paisajismo</h2>
          <p>Hola,</p>
          <p>Tu código de verificación para completar tu ingreso es:</p>
          <div style="background-color: #1b3022; color: #f5f2eb; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #666;">Este código caducará en 10 minutos. Si no solicitaste este código, podés ignorar este correo.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[MAILER] Código OTP enviado con éxito a ${email}`);
    } catch (error) {
      console.error(`[MAILER ERROR] Error al enviar correo a ${email}:`, error);
    }
  }

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

  async register(registerUserDto: RegisterUserDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const otpCode = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const userRecord = await auth.createUser({
        email: registerUserDto.email,
        password: registerUserDto.password,
        displayName: registerUserDto.name,
      });

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

      await userRef.update({
        isEmailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date().toISOString(),
      });

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

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getFirestore();

    try {
      const decodedToken = await auth.verifyIdToken(googleLoginDto.idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email || googleLoginDto.email;

      const userRef = db.collection(this.collectionName).doc(uid);
      const userDoc = await userRef.get();

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
          isEmailVerified: false,
          otpCode,
          otpExpiresAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await userRef.set(newUser);
        await this.sendVerificationEmail(email, otpCode);

        throw new UnauthorizedException({
          message: 'Debes verificar tu correo electrónico para completar el registro.',
          requiresVerification: true,
          email,
        });
      }

      const userData = userDoc.data();

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