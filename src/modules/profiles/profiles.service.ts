import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateSchoolProfileDto,
  CreateBlogPostDto,
} from './dto/update-school-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. School Profile
  async getSchoolProfile(tenantId: string) {
    let profile = await this.prisma.schoolProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      // Auto-create default school profile if not exists
      profile = await this.prisma.schoolProfile.create({
        data: {
          tenantId,
          motto: 'پرورش استعداد، پیشرو در نوآوری و مهارت‌آموزی',
          aboutHtml: '<p>به سامانه هوشمند مدیریت آموزشی و پرورشی رُکاد خوش آمدید.</p>',
        },
      });
    }

    return profile;
  }

  async updateSchoolProfile(tenantId: string, dto: UpdateSchoolProfileDto) {
    return this.prisma.schoolProfile.upsert({
      where: { tenantId },
      update: {
        motto: dto.motto,
        aboutHtml: dto.aboutHtml,
        headerImageUrl: dto.headerImageUrl,
        socialLinks: dto.socialLinks,
        managerName: dto.managerName,
        managerMessage: dto.managerMessage,
        achievements: dto.achievements,
      },
      create: {
        tenantId,
        motto: dto.motto,
        aboutHtml: dto.aboutHtml,
        headerImageUrl: dto.headerImageUrl,
        socialLinks: dto.socialLinks,
        managerName: dto.managerName,
        managerMessage: dto.managerMessage,
        achievements: dto.achievements,
      },
    });
  }

  // 2. Profile Blogs
  async listBlogPosts(tenantId: string, authorId?: string, onlyPublished: boolean = true) {
    return this.prisma.profileBlog.findMany({
      where: {
        tenantId,
        ...(authorId ? { authorId } : {}),
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBlogPost(tenantId: string, authorId: string, dto: CreateBlogPostDto) {
    const existing = await this.prisma.profileBlog.findFirst({
      where: { tenantId, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('مقاله‌ای با این اسلاگ در این مدرسه قبلاً ثبت شده است');
    }

    return this.prisma.profileBlog.create({
      data: {
        tenantId,
        authorId,
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
        publishedAt: dto.isPublished ? new Date() : null,
        tags: dto.tags || [],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async getBlogPostBySlug(tenantId: string, slug: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { tenantId, slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('مقاله مورد نظر یافت نشد');
    }

    // Increment view count asynchronously
    await this.prisma.profileBlog.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return post;
  }
}
