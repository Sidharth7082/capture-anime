
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile } from 'lucide-react';
import axios from 'axios';

const SFW_CATEGORIES = [
    'waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug',
    'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill',
    'kick', 'happy', 'wink', 'poke', 'dance', 'cringe'
];

const WaifuPicsGallery: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('waifu');

    // Cached per category; switching categories refetches, and responses are
    // deduped so rapid category clicks can't show stale images.
    const { data: images, isLoading } = useQuery({
        queryKey: ['waifu-pics', selectedCategory],
        queryFn: async () => {
            const response = await axios.post(`https://api.waifu.pics/many/sfw/${selectedCategory}`, {
                exclude: []
            });
            return (response.data.files || []) as string[];
        },
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-wrap gap-2 justify-center">
                {SFW_CATEGORIES.map(category => (
                    <Button
                        key={category}
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory(category)}
                        className={`capitalize transition-all duration-200 ${selectedCategory === category ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-lg scale-105' : 'bg-white/80 hover:bg-purple-50'}`}
                    >
                        {category}
                    </Button>
                ))}
            </div>

            {isLoading ? (
                <section className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {[...Array(30)].map((_, idx) => (
                        <Skeleton
                            key={idx}
                            className="aspect-square rounded-lg w-full bg-zinc-200"
                        />
                    ))}
                </section>
            ) : (images ?? []).length > 0 ? (
                <section className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
                    {(images ?? []).map((url) => (
                        <div key={url} className="relative group overflow-hidden rounded-lg shadow-md border border-zinc-200/80 bg-zinc-100">
                            <img src={url} alt={`${selectedCategory}`} className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                        </div>
                    ))}
                </section>
            ) : (
                <div className="col-span-full text-zinc-500 text-center p-10 flex flex-col items-center bg-zinc-100/50 rounded-lg border border-dashed">
                  <Smile className="w-16 h-16 mb-4 text-zinc-400" />
                  <p className="font-semibold text-lg">No images found</p>
                  <p className="text-sm">Try selecting another category.</p>
                </div>
            )}
        </div>
    );
};

export default WaifuPicsGallery;
