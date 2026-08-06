
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageDetailModal } from "./ImageDetailModal";

const POST_LIMIT = 20;

interface Post {
  id: number;
  preview_file_url: string;
  large_file_url: string;
  file_url: string;
  tag_string_general: string;
  tag_string_artist: string;
  tag_string_copyright: string;
  tag_string_character: string;
  tag_string_meta: string;
  rating: string;
}

const DanbooruGallery = ({ currentSearch, onTagClick }: { currentSearch: string, onTagClick: (tag: string) => void }) => {
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Query is keyed by (search, page): changing either refetches automatically,
  // responses are cached/deduped by React Query, and stale pages can never
  // overwrite newer ones.
  const { data: posts, isLoading, isError } = useQuery({
    queryKey: ["danbooru-posts", currentSearch, page],
    queryFn: async () => {
      const response = await axios.get("https://danbooru.donmai.us/posts.json", {
        params: {
          tags: currentSearch,
          limit: POST_LIMIT,
          page,
        },
      });
      return (response.data as Post[]).filter((p) => p.id && (p.preview_file_url || p.large_file_url));
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev, // keep previous page visible while loading the next
  });

  const hasMore = (posts?.length ?? 0) === POST_LIMIT;

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error fetching posts",
        description: "Could not load images from Danbooru.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);

  // A new search always starts from page 1.
  useEffect(() => {
    setPage(1);
  }, [currentSearch]);

  const handlePrevious = () => {
    if (page > 1 && !isLoading) {
      setPage((p) => p - 1);
    }
  };

  const handleNext = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px]">
        {isLoading && !posts ? (
          Array.from({ length: POST_LIMIT }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full h-auto rounded-lg" />)
        ) : (
          (posts ?? []).map((post) => (
            <div 
              key={post.id} 
              className="group aspect-[3/4] bg-black/5 rounded-lg overflow-hidden border relative cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <img 
                src={post.preview_file_url || post.large_file_url} 
                alt={post.tag_string_general} 
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))
        )}
      </div>
      
      {!isLoading && posts?.length === 0 && (
         <div className="text-center text-zinc-500 col-span-full py-10">
            <p>No results found. Try different tags!</p>
         </div>
      )}

      {!isLoading && (posts?.length ?? 0) > 0 && (page > 1 || hasMore) && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button 
                  variant="ghost" 
                  size="default" 
                  onClick={handlePrevious} 
                  disabled={page === 1 || isLoading}
                  className="gap-1 pl-2.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 py-2 font-medium text-sm text-zinc-700">Page {page}</span>
              </PaginationItem>
              <PaginationItem>
                <Button 
                  variant="ghost" 
                  size="default" 
                  onClick={handleNext} 
                  disabled={!hasMore || isLoading}
                  className="gap-1 pr-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {selectedPost && (
        <ImageDetailModal 
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedPost(null);
            }
          }}
          onTagClick={onTagClick}
        />
      )}
    </>
  );
};

export default DanbooruGallery;
