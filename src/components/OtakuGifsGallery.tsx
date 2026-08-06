
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, ZoomIn } from "lucide-react";
import { GifDetailModal } from "./GifDetailModal";

type Source = "otakugifs" | "nekos.best";

interface Gif {
  url: string;
  animeName?: string;
  sourceUrl?: string;
}

const GIF_COUNT = 12;

const OtakuGifsGallery = () => {
  const [source, setSource] = useState<Source>("otakugifs");
  const [nsfw, setNsfw] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const { toast } = useToast();
  // Discards responses that resolve after a newer source/category was chosen.
  const categorySeqRef = useRef(0);
  const gifsSeqRef = useRef(0);

  const fetchCategories = useCallback(async (currentSource: Source, isNsfw: boolean) => {
    const seq = ++categorySeqRef.current;
    setLoadingCategories(true);
    try {
      let fetchedCategories: string[] = [];
      if (currentSource === "otakugifs") {
        const result = await axios.get("https://api.otakugifs.xyz/gif/allreactions");
        fetchedCategories = result.data.reactions || [];
      } else if (currentSource === "nekos.best") {
        const result = await axios.get("https://nekos.best/api/v2/endpoints");
        fetchedCategories = result.data[isNsfw ? 'nsfw' : 'sfw']?.gif || [];
      }
      if (seq !== categorySeqRef.current) return;
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0) {
        const defaultCategory = "hug";
        if (fetchedCategories.includes(defaultCategory)) {
          setSelectedCategory(defaultCategory);
        } else {
          setSelectedCategory(fetchedCategories[0]);
        }
      } else {
        setSelectedCategory("");
        setGifs([]);
      }
    } catch (error) {
      if (seq !== categorySeqRef.current) return;
      toast({
        title: "Error fetching categories",
        description: "Could not load the list of GIF categories.",
        variant: "destructive",
      });
      setCategories([]);
    } finally {
      if (seq === categorySeqRef.current) setLoadingCategories(false);
    }
  }, [toast]);

  const fetchGifs = useCallback(async (category: string, currentSource: Source, loadMore = false) => {
    if (!category) return;
    const seq = ++gifsSeqRef.current;
    
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoadingGifs(true);
      setGifs([]);
    }

    try {
      const gifPromises = Array.from({ length: GIF_COUNT }).map(() => {
        if (currentSource === 'otakugifs') {
          return axios.get(`https://api.otakugifs.xyz/gif?reaction=${category}`);
        } else { // nekos.best
          return axios.get(`https://nekos.best/api/v2/${category}`);
        }
      });
      
      const responses = await Promise.all(gifPromises);
      if (seq !== gifsSeqRef.current) return;
      
      const newGifs: Gif[] = responses
        .map(res => {
          if (currentSource === 'otakugifs') {
            return { url: res.data.url };
          } else { // nekos.best
            const result = res.data.results[0];
            return {
              url: result.url,
              animeName: result.anime_name,
              sourceUrl: result.source_url,
            };
          }
        })
        .filter((gif, index, self) => gif.url && self.findIndex(g => g.url === gif.url) === index);

      setGifs(prev => loadMore ? [...prev, ...newGifs] : newGifs);
    } catch (error) {
      if (seq !== gifsSeqRef.current) return;
      toast({
        title: "Error fetching GIFs",
        description: "Could not load GIFs for the selected category.",
        variant: "destructive",
      });
    } finally {
      if (seq === gifsSeqRef.current) {
        if (loadMore) setLoadingMore(false); else setLoadingGifs(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    setGifs([]);
    setSelectedCategory("");
    fetchCategories(source, nsfw);
  }, [source, nsfw, fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchGifs(selectedCategory, source);
    }
  }, [selectedCategory, source, fetchGifs]);
  
  const handleLoadMore = () => {
    if (selectedCategory) {
      fetchGifs(selectedCategory, source, true);
    }
  };

  const handleGifClick = (gif: Gif) => {
    setSelectedGif(gif);
  };

  return (
    <div className="flex flex-col gap-6 p-4 border border-zinc-200/80 rounded-2xl bg-white/60 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 ml-auto">
          <Select onValueChange={(v) => setSource(v as Source)} value={source}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="otakugifs">OtakuGIFs</SelectItem>
              <SelectItem value="nekos.best">Nekos.best</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Switch id="nsfw-toggle" checked={nsfw} onCheckedChange={setNsfw} disabled={source === 'otakugifs'} />
            <Label htmlFor="nsfw-toggle" className={source === 'otakugifs' ? 'text-gray-400' : ''}>NSFW</Label>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center">
        {loadingCategories ? (
          Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-md" />)
        ) : (
          categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="capitalize transition-all"
            >
              {category}
            </Button>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[200px]">
        {loadingGifs ? (
          Array.from({ length: GIF_COUNT }).map((_, i) => <Skeleton key={i} className="aspect-square w-full h-auto rounded-lg" />)
        ) : (
          gifs.map((gif, i) => (
            <div key={`${gif.url}-${i}`} className="group aspect-square bg-black/5 rounded-lg overflow-hidden border relative cursor-pointer" onClick={() => handleGifClick(gif)}>
              <img src={gif.url} alt={gif.animeName || selectedCategory} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <ZoomIn className="text-white/80 w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loadingGifs && gifs.length > 0 && categories.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load More
          </Button>
        </div>
      )}

      <GifDetailModal 
        gif={selectedGif} 
        open={!!selectedGif} 
        onOpenChange={(open) => !open && setSelectedGif(null)}
      />
    </div>
  );
};

export default OtakuGifsGallery;
