import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RegisterMediaAssetDto, UpdateMediaAssetDto } from './dto/media.dto';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, folder?: string, page = 1, limit = 9) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = {
      workspaceId,
      ...(folder ? { folder } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async register(workspaceId: string, dto: RegisterMediaAssetDto) {
    const s3Key = `workspaces/${workspaceId}/${Date.now()}-${dto.fileName}`;
    return this.prisma.mediaAsset.create({
      data: {
        workspaceId,
        fileName: dto.fileName.trim(),
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        mediaType: dto.mediaType,
        s3Key,
        url: dto.url,
        folder: dto.folder?.trim() ?? null,
      },
    });
  }

  async update(workspaceId: string, mediaId: string, dto: UpdateMediaAssetDto) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, workspaceId },
    });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    return this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        ...(dto.fileName !== undefined ? { fileName: dto.fileName.trim() } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.folder !== undefined ? { folder: dto.folder.trim() || null } : {}),
      },
    });
  }

  async remove(workspaceId: string, mediaId: string): Promise<{ success: boolean }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, workspaceId },
    });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    return { success: true };
  }
}
