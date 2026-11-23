import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('meta')
  @ApiOperation({ summary: 'Meta webhook endpoint verification' })
  verifyMeta(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    return this.webhooksService.verifyMetaChallenge(mode, token, challenge);
  }

  @Post('meta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Meta (Facebook/Instagram) webhook events' })
  receiveMeta(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.webhooksService.ingestMetaEvent(
      JSON.stringify(payload),
      signature,
      payload,
    );
  }

  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive TikTok webhook events' })
  receiveTikTok(@Body() payload: Record<string, unknown>) {
    const eventId = String(payload.event_id ?? Date.now());
    const eventType = String(payload.event ?? 'tiktok_event');
    return this.webhooksService.ingestTikTokEvent(eventId, eventType, payload);
  }
}
