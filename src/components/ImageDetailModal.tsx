import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Download, Loader2, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import axios from 'axios';

interface Post {
  id: number;
  large_file_url: string;
  file_url: string;
  tag_string_general: string;
  tag_string_artist: string;
  tag_string_copyright: string;
  tag_string_character: string;
  tag_string_meta: string;
  rating: string;
}
interface ImageDetailModalProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagClick: (tag: string) => void;
}
const tagColors: {
  [key: string]: string;
} = {
  artist: 'text-red-400',
  copyright: 'text-green-400',
  character: 'text-purple-400',
  general: 'text-blue-400',
  meta: 'text-yellow-500'
};
const TagSection = ({
  title,
  tags,
  onTagClick
}: {
  title: string;
  tags: string;
  onTagClick: (tag: string) => void;
}) => {
  if (!tags) return null;
  const tagArray = tags.split(' ').filter(t => t);
  if (tagArray.length === 0) return null;
  const titleKey = title.toLowerCase();
  return <div className="mb-6">
      <h4 className={`text-xl font-bold mb-3 capitalize ${tagColors[titleKey] || 'text-zinc-300'}`}>{title.replace(/_/g, ' ')}</h4>
      <div className="flex flex-wrap gap-2">
        {tagArray.map(tag => <Badge key={tag} variant="secondary" className="cursor-pointer rounded-md bg-zinc-700/60 hover:bg-zinc-700/90 text-zinc-300 hover:text-white transition-colors py-1 px-3" onClick={() => onTagClick(tag)} title={`Add tag: ${tag}`}>
            {tag.replace(/_/g, ' ')}
          </Badge>)}
      </div>
    </div>;
};
export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  post,
  open,
  onOpenChange,
  onTagClick
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const {
    toast
  } = useToast();
  if (!post) return null;

  const imageUrl = post.file_url || post.large_file_url;

  const handleDownload = async () => {
    if (!imageUrl) {
      toast({
        title: "Download failed",
        description: "No high-resolution image available for this post.",
        variant: "destructive"
      });
      return;
    }
    setIsDownloading(true);
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      link.setAttribute('download', `danbooru_${post.id}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not download the image. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewFullSize = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setImageScale(1);
  };

  const handleTagClickAndClose = (tag: string) => {
    onTagClick(tag);
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-2xl w-[98vw] h-[98vh] p-0 gap-0 bg-zinc-900 border-zinc-800 text-zinc-50 overflow-hidden">
        <DialogTitle className="sr-only">Image Detail for Post {post.id}</DialogTitle>
        <DialogDescription className="sr-only">Detailed view of a Danbooru image with tags and options.</DialogDescription>
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] h-full">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-zinc-800">
               <h3 className="text-2xl font-bold mb-4">Post Details</h3>
               <div className="flex flex-col gap-2">
                 <Button variant="outline" onClick={handleDownload} disabled={isDownloading} size="sm" className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white">
                     {isDownloading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
                     {isDownloading ? 'Downloading...' : 'Download'}
                 </Button>
                 <Button variant="outline" onClick={handleViewFullSize} size="sm" className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white">
                     <Eye size={16} className="mr-2" />
                     View Full Size
                 </Button>
               </div>
            </div>
            <div className="p-6 border-b border-zinc-800">
              <h4 className="text-lg font-semibold mb-3">Image Controls</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleZoomIn} size="sm" className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white">
                  <ZoomIn size={16} className="mr-2" />
                  Zoom In
                </Button>
                <Button variant="outline" onClick={handleZoomOut} size="sm" className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white">
                  <ZoomOut size={16} className="mr-2" />
                  Zoom Out
                </Button>
                <Button variant="outline" onClick={handleResetZoom} size="sm" className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white">
                  <RotateCcw size={16} className="mr-2" />
                  Reset Zoom
                </Button>
                <div className="text-sm text-zinc-400 mt-2">
                  Scale: {Math.round(imageScale * 100)}%
                </div>
              </div>
            </div>
            <ScrollArea className="h-full">
              <div className="p-6">
                <TagSection title="Artist" tags={post.tag_string_artist} onTagClick={handleTagClickAndClose} />
                <TagSection title="Copyright" tags={post.tag_string_copyright} onTagClick={handleTagClickAndClose} />
                <TagSection title="Character" tags={post.tag_string_character} onTagClick={handleTagClickAndClose} />
                <TagSection title="General" tags={post.tag_string_general} onTagClick={handleTagClickAndClose} />
                <TagSection title="Meta" tags={post.tag_string_meta} onTagClick={handleTagClickAndClose} />
              </div>
            </ScrollArea>
          </div>
          <div className="h-full bg-black">
            <ScrollArea className="h-full w-full">
              <div className="flex min-h-full items-center justify-center p-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={post.tag_string_general}
                    className="max-w-full transition-transform duration-200 ease-out"
                    style={{ 
                      transform: `scale(${imageScale})`,
                      imageRendering: imageScale > 1 ? 'pixelated' : 'auto'
                    }}
                  />
                ) : (
                  <div className="text-white">Image not available</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
