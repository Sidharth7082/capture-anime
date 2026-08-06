import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DanbooruGallery from "@/components/DanbooruGallery";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import RandomTags from "@/components/RandomTags";
import { usePageMeta } from "@/hooks/use-page-meta";

const DanbooruPage = () => {
  usePageMeta("Danbooru Images", "High-quality anime image board — search by tag and rating.");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState("sfw");
  const [currentSearch, setCurrentSearch] = useState("rating:safe");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Sanitize tag input: Danbooru tags are lowercase words/underscores; strip
    // anything else (prevents malformed or injection-style tag strings).
    const cleanTags = tags.replace(/[^a-zA-Z0-9_\s-]/g, "").trim();
    let searchString = cleanTags;
    if (rating === "sfw") {
      searchString = `${cleanTags} rating:safe`;
    } else if (rating === "nsfw") {
      searchString = `${cleanTags} rating:questionable,explicit`;
    }
    setCurrentSearch(searchString.trim());
  };

  const handleTagClick = (tag: string) => {
    setTags(prev => {
      const tagsArray = prev.split(' ').filter(Boolean);
      if (tagsArray.includes(tag)) {
        return prev;
      }
      return [...tagsArray, tag].join(' ');
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
        <NavBar onSearch={() => {}} />

        {/* Main Content */}
        <main className="flex-1 w-full py-10">
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-8">
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight drop-shadow">Danbooru</h2>
              <p className="text-lg text-zinc-600 mt-1">High-quality anime image board</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8 items-start">
              {/* Left Sidebar */}
              <aside className="md:sticky top-24 h-fit">
                <div className="p-4 border border-zinc-200/80 rounded-2xl bg-white/60 shadow-lg backdrop-blur-sm">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-zinc-800">Search Options</h3>
                    <form onSubmit={handleSearch} className="flex flex-col gap-4">
                      <div>
                        <Label htmlFor="tags-input" className="font-semibold text-zinc-700 mb-2 block">Tags</Label>
                        <Input 
                          id="tags-input"
                          placeholder="e.g. 'genshin_impact long_hair'"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                        />
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-700 mb-2">Rating</h4>
                        <RadioGroup value={rating} onValueChange={setRating} className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="r-all" />
                            <Label htmlFor="r-all">All</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sfw" id="r-sfw" />
                            <Label htmlFor="r-sfw">SFW</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="nsfw" id="r-nsfw" />
                            <Label htmlFor="r-nsfw">NSFW</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <Button type="submit" className="w-full">
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </Button>
                    </form>
                  </div>
                  <RandomTags onTagClick={handleTagClick} />
                </div>
              </aside>

              {/* Right Content */}
              <div className="p-4 border border-zinc-200/80 rounded-2xl bg-white/60 shadow-lg backdrop-blur-sm">
                <DanbooruGallery currentSearch={currentSearch} onTagClick={handleTagClick} />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
      {/* Mobile Sidebar Trigger */}
      <SidebarTrigger className="fixed top-4 left-4 z-[100] md:hidden bg-white/80 rounded-full p-2 shadow-lg ring-1 ring-zinc-900 hover:bg-purple-200/90 hover:text-purple-800 transition" />
    </SidebarProvider>
  );
};

export default DanbooruPage;
