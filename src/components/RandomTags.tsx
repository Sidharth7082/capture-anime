
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/components/ui/use-toast";

interface Tag {
  name: string;
  post_count: number;
}

interface RandomTagsProps {
  onTagClick: (tag: string) => void;
}

const RandomTags: React.FC<RandomTagsProps> = ({ onTagClick }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const { toast } = useToast();

  const fetchRandomTags = useCallback(async () => {
    setLoading(true);
    try {
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const response = await axios.get('https://danbooru.donmai.us/tags.json', {
        params: {
          'search[category]': 0, // General tags
          'search[order]': 'count',
          limit: 15,
          page: randomPage,
        },
      });
      setTags(response.data.filter((tag: Tag) => tag.name && tag.post_count > 1000));
    } catch (error) {
      toast({
        title: 'Error fetching tags',
        description: 'Could not load random tags from Danbooru.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRandomTags();
  }, [fetchRandomTags, refresh]);

  const handleRefresh = () => {
      if (!loading) {
          setRefresh(r => r + 1)
      }
  }

  return (
    <div className="space-y-3 pt-4 border-t border-zinc-200/80 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-zinc-800">Random Tags</h3>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>New tags</span>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {loading ? (
          Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="h-6 w-20 rounded-md" />)
        ) : (
          tags.map((tag) => (
            <Badge
              key={tag.name}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => onTagClick(tag.name)}
              title={`Add tag: ${tag.name}`}
            >
              {tag.name.replace(/_/g, ' ')}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
};

export default RandomTags;
