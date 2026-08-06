
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ExternalLink, Download, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { useToast } from './ui/use-toast';

interface GifDetail {
  url: string;
  animeName?: string;
  sourceUrl?: string;
}

interface GifDetailModalProps {
  gif: GifDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GifDetailModal: React.FC<GifDetailModalProps> = ({ gif, open, onOpenChange }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  if (!gif) return null;

  const handleDownload = async () => {
    if (!gif) return;
    setIsDownloading(true);

    const fileExtension = gif.url.split('.').pop()?.split('?')[0] || 'gif';
    const baseName = gif.animeName ? gif.animeName.replace(/\s/g, '_') : `gif_${Date.now()}`;
    const sanitizedFileName = baseName.replace(/[<>:"/\\|?*]/g, '');
    const fileName = `${sanitizedFileName}.${fileExtension}`;

    try {
      // Attempt 1: Fetch as a blob. This works for servers with permissive CORS.
      const response = await axios.get(gif.url, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      toast({
        title: "Download Started",
        description: "Your GIF is downloading.",
      });

      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Blob download failed, attempting fallback:", error);
      // Fallback: For CORS errors, trigger a download by opening the link.
      try {
        const link = document.createElement('a');
        link.href = gif.url;
        link.setAttribute('download', fileName);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Redirecting for download",
          description: "Your GIF should open in a new tab to save.",
        });
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
        toast({
          title: "Download Failed",
          description: "You can try right-clicking the GIF to save it.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900/80 border-none shadow-2xl backdrop-blur-md max-w-4xl w-[90vw] p-0 text-white overflow-hidden">
        <div className="relative group flex justify-center items-center bg-black">
          <img src={gif.url} alt={gif.animeName || 'GIF'} className="w-auto h-auto object-contain max-h-[85vh] max-w-full" />
          
          <div className="absolute top-0 right-0 p-2 bg-gradient-to-l from-black/50 to-transparent">
             {gif.sourceUrl && (
              <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <a href={gif.sourceUrl} target="_blank" rel="noopener noreferrer" title="View source">
                  <ExternalLink size={20} />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloading} className="text-white hover:bg-white/20" title="Download GIF">
              {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </Button>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="Close">
                    <X size={20} />
                </Button>
            </DialogClose>
          </div>
          
          {gif.animeName && (
            <div className="absolute bottom-0 left-0 p-4 bg-gradient-to-t from-black/70 to-transparent w-full">
              <p className="text-lg font-bold drop-shadow-lg">Anime: {gif.animeName}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
