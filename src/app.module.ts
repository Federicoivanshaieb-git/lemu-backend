import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FirebaseModule } from './firebase/firebase.module.js';
import { CloudinaryModule } from './cloudinary/cloudinary.module.js';
import { QuotesModule } from './quotes/quotes.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    CloudinaryModule,
    QuotesModule,
    AuthModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
