import React, { useState, useRef, useEffect } from "react";
import { searchAnime } from "@/lib/api";
import type { JikanAnime } from "@/types/jikan";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (anime: JikanAnime | null) => void;
  className?: string;
  wrapperClass?: string;
  placeholder?: string;
}

const AnimeSearchBar: React.FC<Props> = ({ onSelect, className, wrapperClass, placeholder }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Monotonic counter used to discard stale responses: if the user keeps
  // typing, an older (slower) request must not overwrite newer results.
  const requestSeqRef = useRef(0);

  // Close the dropdown when clicking/tapping anywhere outside the search box.
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Reset the highlighted row whenever the result list changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Clear any pending debounce when the component unmounts so a late search
  // response can never call setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestSeqRef.current++;
    };
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      requestSeqRef.current++;
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++requestSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const searchRes = await searchAnime(val);
        if (seq === requestSeqRef.current) {
          setResults(searchRes.slice(0, 8));
        }
      } catch {
        if (seq === requestSeqRef.current) {
          setResults([]);
        }
      }
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }, 400);
  };

  const selectAnime = (anime: JikanAnime) => {
    requestSeqRef.current++;
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    onSelect(anime);
  };

  const handleReset = () => {
    requestSeqRef.current++;
    setQuery("");
    setResults([]);
    onSelect(null);
  };

  // Keyboard navigation: arrows move the highlight, Enter picks it, Escape
  // closes the dropdown.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectAnime(results[activeIndex]);
    } else if (e.key === "Escape") {
      setResults([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-lg mx-auto mb-2", className)}>
      <div className={cn("flex items-center bg-card/75 rounded-lg border px-2 py-1 shadow focus-within:ring-2 ring-[#e50914] backdrop-blur", wrapperClass)}>
        <Search className="text-muted-foreground mr-2" size={20} />
        <Input
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search anime (e.g. Naruto, Attack on Titan)…"}
          className="!border-0 bg-transparent font-medium text-base focus:ring-0 focus-visible:ring-0"
          autoFocus={false}
          aria-label="Search anime"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="anime-search-results"
          aria-activedescendant={activeIndex >= 0 ? `anime-result-${results[activeIndex]?.mal_id}` : undefined}
        />
        {query ? (
          <Button size="icon" variant="ghost" onClick={handleReset} className="ml-1" aria-label="Clear">
            <X size={18} />
          </Button>
        ) : null}
        {loading && (
          <Loader2 className="animate-spin ml-2 text-muted-foreground" size={18} />
        )}
      </div>
      {results.length > 0 && (
        <div
          id="anime-search-results"
          role="listbox"
          className="absolute left-0 right-0 bg-popover/90 shadow-lg rounded-lg mt-1 z-30 animate-fade-in overflow-hidden max-h-72 border border-card/35 backdrop-blur-lg"
        >
          {results.map((anime, index) => (
            <button
              key={anime.mal_id}
              id={`anime-result-${anime.mal_id}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectAnime(anime)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 w-full text-left border-b border-border/25 last-of-type:border-b-0 transition",
                index === activeIndex
                  ? "bg-secondary/90"
                  : "hover:bg-secondary/90 focus:bg-secondary focus:outline-none focus-visible:ring-2 ring-[#e50914]"
              )}
              tabIndex={-1}
            >
              <img
                src={
                  anime.images?.webp?.image_url ||
                  anime.images?.jpg?.image_url ||
                  ""
                }
                alt={anime.title}
                className="w-10 h-14 object-cover rounded shadow bg-zinc-900"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src =
                    "/placeholder.svg")
                }
              />
              <span className="font-semibold line-clamp-1">
                {anime.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimeSearchBar;
