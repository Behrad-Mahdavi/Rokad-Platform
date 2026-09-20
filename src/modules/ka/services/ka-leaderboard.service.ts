import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class KaLeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(tenantId: string) {
    // In PostgreSQL we use window functions to get ranks.
    // DENSE_RANK() OVER (ORDER BY "kaScore" DESC) 
    // We join StudentProfile with User, ClassEnrollment and Classroom to get the classroom.
    
    // We use a raw query because Prisma does not natively support Window Functions
    const leaderboardRaw = await this.prisma.$queryRaw`
      WITH RankedStudents AS (
        SELECT 
          s."id" as "studentId",
          u."firstName",
          u."lastName",
          u."avatarUrl",
          s."kaScore",
          s."kaToken",
          c."name" as "className",
          c."id" as "classroomId",
          DENSE_RANK() OVER (ORDER BY s."kaScore" DESC)::int as "rankInSchool",
          DENSE_RANK() OVER (PARTITION BY c."id" ORDER BY s."kaScore" DESC)::int as "rankInClass"
        FROM "StudentProfile" s
        JOIN "User" u ON s."userId" = u."id"
        LEFT JOIN "ClassEnrollment" ce ON s."id" = ce."studentId" AND ce."status" = 'ACTIVE'
        LEFT JOIN "Classroom" c ON ce."classroomId" = c."id"
        WHERE s."tenantId" = ${tenantId}
      )
      SELECT * FROM RankedStudents
      ORDER BY "rankInSchool" ASC, "kaScore" DESC
      LIMIT 100;
    `;

    return leaderboardRaw;
  }
}
