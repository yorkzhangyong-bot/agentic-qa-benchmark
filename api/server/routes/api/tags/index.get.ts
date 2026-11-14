import { Tag } from '~/models/tag.model';
import { definePrivateEventHandler } from '~/auth-event-handler';

// The ten tags with the most articles, most used first.
export default definePrivateEventHandler(
  async () => {
    const popularTags = await usePrisma().tag.findMany({
      where: { articles: { some: {} } },
      select: { name: true },
      orderBy: { articles: { _count: 'desc' } },
      take: 10,
    });

    return { tags: popularTags.map((tag: Tag) => tag.name) };
  },
  { requireAuth: false },
);
