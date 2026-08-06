
import React from 'react';
import { Card } from '@/components/ui/card';
import { ImageIcon, Star, BookOpen } from 'lucide-react';
import type { JikanManga } from '@/types/jikan';

interface Props {
  manga: JikanManga;
  onClick: () => void;
}

const MangaCard: React.FC<Props> = ({ manga, onClick }) => (
  <Card
    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden group border-zinc-200"
    onClick={onClick}
    onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    tabIndex={0}
  >
    <div className="relative">
      <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 shadow-md">
        {manga.rank}
      </div>
      {manga.publishing && (
        <div className="absolute top-3 left-12 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full z-10 shadow">
          PUBLISHING
        </div>
      )}
      {manga.score && (
         <div className="absolute top-3 right-3 bg-zinc-800 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 z-10 shadow">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {manga.score}
        </div>
      )}
      <div className="overflow-hidden rounded-t-lg">
        {manga.images?.webp?.image_url || manga.images?.jpg?.image_url ? (
          <img
            src={manga.images.webp?.image_url || manga.images.jpg.image_url}
            alt={manga.title}
            className="aspect-[2/3] w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="aspect-[2/3] w-full flex items-center justify-center bg-zinc-100 text-zinc-400">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>
    </div>
    <div className="p-3">
      <h3 className="font-bold text-base truncate text-zinc-900" title={manga.title}>
        {manga.title}
      </h3>
      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        <span>{manga.type}</span>
        {manga.chapters && <span className="ml-2">{manga.chapters} ch</span>}
        {manga.volumes && <span className="ml-2">{manga.volumes} vol</span>}
      </div>
      <div className="flex flex-wrap gap-1 text-xs mt-2">
        {manga.genres?.slice(0, 3).map((g) => (
          <span
            className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs font-medium"
            key={g.name}
          >
            {g.name}
          </span>
        ))}
      </div>
    </div>
  </Card>
);

export default MangaCard;
